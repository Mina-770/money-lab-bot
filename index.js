const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

const PORT = process.env.PORT || 3000;

// =========================
// 基本工具
// =========================

function getGroupId(event) {
  return event.source.groupId || event.source.roomId || event.source.userId;
}

function getUserId(event) {
  return event.source.userId;
}

async function getDisplayName(userId) {
  if (!userId) return "未知使用者";

  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return userId;
    }

    const data = await response.json();
    return data.displayName || userId;
  } catch (error) {
    console.error("取得 LINE 名稱失敗：", error);
    return userId;
  }
}

// =========================
// KC 付款文字處理
// =========================

// 支援：
// KC付
// KC 付
// KC付款
// KC 付款
// KC付的
// KC 付的
function hasKCPayer(text) {
  return /KC\s*付(?:款|的)?/iu.test(text);
}

function cleanPayerText(text) {
  return text
    .replace(/KC\s*付款/giu, "")
    .replace(/KC\s*付的/giu, "")
    .replace(/KC\s*付/giu, "")
    .trim();
}

// =========================
// 記帳解析
// =========================

function parseExpenseLine(line) {
  // 先把「KC付」拿掉
  // 這樣「晚餐600 KC付」才能正常解析
  const cleanedLine = cleanPayerText(line);

  const match = cleanedLine.match(
    /^(.+?)\s*(\d+(?:\.\d+)?)\s*元?$/
  );

  if (!match) {
    return null;
  }

  const item = match[1].trim();
  const amount = Number(match[2]);

  if (!item || !amount) {
    return null;
  }

  return {
    item,
    amount
  };
}

// =========================
// 儲存支出
// =========================

async function saveExpense({
  event,
  item,
  amount,
  category = "其他",
  payerName
}) {
  const groupId = getGroupId(event);
  const userId = getUserId(event);
  const userName = await getDisplayName(userId);

  const actualPayerName = payerName || userName;

  // 暫時用名稱作為付款人識別
  // 後續再升級成真正的 LINE user ID
  const payerUserId =
    actualPayerName === "KC"
      ? "KC"
      : userId;

  const { error } = await supabase
    .from("records")
    .insert({
      group_id: groupId,
      user_id: userId,
      user_name: userName,
      payer_user_id: payerUserId,
      item,
      amount,
      category,
      type: "expense",
      payer_name: actualPayerName,
      note: null,
      participants: "shared",
      transaction_date: new Date().toISOString()
    });

  if (error) {
    console.error("Supabase 寫入失敗：", error);
    throw error;
  }

  return {
    item,
    amount,
    payerName: actualPayerName
  };
}

// =========================
// 分類
// =========================

function detectCategory(item) {
  const text = item.toLowerCase();

  if (
    /早餐|午餐|晚餐|宵夜|吃飯|便當|火鍋|燒肉|牛肉麵|拉麵|麵|飯|雞排|炸雞|飲料|咖啡|奶茶|可可|甜點|蛋糕/.test(
      text
    )
  ) {
    return "飲食";
  }

  if (/電影|遊戲|唱歌|旅遊|景點|娛樂/.test(text)) {
    return "娛樂";
  }

  if (/捷運|公車|高鐵|火車|計程車|油錢|停車/.test(text)) {
    return "交通";
  }

  if (/衣服|鞋子|包包|購物/.test(text)) {
    return "購物";
  }

  if (/房租|水電|瓦斯|網路|管理費/.test(text)) {
    return "居住";
  }

  return "其他";
}

// =========================
// 收入
// =========================

function parseIncome(text) {
  const match = text.match(
    /^收入\s+(.+?)\s*(\d+(?:\.\d+)?)\s*元?$/
  );

  if (!match) {
    return null;
  }

  return {
    item: match[1].trim(),
    amount: Number(match[2])
  };
}

async function saveIncome(event, item, amount) {
  const groupId = getGroupId(event);
  const userId = getUserId(event);
  const userName = await getDisplayName(userId);

  const { error } = await supabase
    .from("records")
    .insert({
      group_id: groupId,
      user_id: userId,
      user_name: userName,
      payer_user_id: userId,
      item,
      amount,
      category: "收入",
      type: "income",
      payer_name: userName,
      note: null,
      participants: "individual",
      transaction_date: new Date().toISOString()
    });

  if (error) {
    console.error("收入寫入失敗：", error);
    throw error;
  }
}

// =========================
// 轉帳
// =========================

function parseTransfer(text) {
  const match = text.match(
    /^我給(.+?)\s*(\d+(?:\.\d+)?)\s*元?$/
  );

  if (!match) {
    return null;
  }

  return {
    to: match[1].trim(),
    amount: Number(match[2])
  };
}

async function saveTransfer(event, to, amount) {
  const groupId = getGroupId(event);
  const userId = getUserId(event);
  const userName = await getDisplayName(userId);

  const { error } = await supabase
    .from("records")
    .insert({
      group_id: groupId,
      user_id: userId,
      user_name: userName,
      payer_user_id: userId,
      item: `給${to}`,
      amount,
      category: "轉帳",
      type: "transfer",
      payer_name: userName,
      note: `轉給${to}`,
      participants: "individual",
      transaction_date: new Date().toISOString()
    });

  if (error) {
    console.error("轉帳寫入失敗：", error);
    throw error;
  }
}

// =========================
// 今天
// =========================

async function getTodaySummary(event) {
  const groupId = getGroupId(event);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("group_id", groupId)
    .eq("type", "expense")
    .gte("transaction_date", start.toISOString())
    .lte("transaction_date", end.toISOString())
    .order("transaction_date", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    return "📅 今天還沒有記帳喔！";
  }

  const total = data.reduce(
    (sum, record) => sum + Number(record.amount),
    0
  );

  let message = `📅 今日記帳\n\n`;

  data.forEach((record) => {
    message += `• ${record.item} $${Number(record.amount).toLocaleString()}`;

    if (record.payer_name) {
      message += `｜${record.payer_name}付`;
    }

    message += "\n";
  });

  message += `\n💰 今日合計：$${total.toLocaleString()}`;

  return message;
}

// =========================
// 本月
// =========================

async function getMonthSummary(event) {
  const groupId = getGroupId(event);

  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("group_id", groupId)
    .eq("type", "expense")
    .gte("transaction_date", start.toISOString())
    .lte("transaction_date", end.toISOString())
    .order("transaction_date", { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    return "📅 本月還沒有記帳喔！";
  }

  const total = data.reduce(
    (sum, record) => sum + Number(record.amount),
    0
  );

  const categoryTotals = {};

  data.forEach((record) => {
    const category = record.category || "其他";

    categoryTotals[category] =
      (categoryTotals[category] || 0) +
      Number(record.amount);
  });

  let message = `📊 本月支出\n\n`;
  message += `💰 總支出：$${total.toLocaleString()}\n\n`;

  Object.entries(categoryTotals).forEach(
    ([category, amount]) => {
      message += `• ${category}：$${amount.toLocaleString()}\n`;
    }
  );

  return message;
}

// =========================
// 統計
// =========================

async function getStatistics(event) {
  const groupId = getGroupId(event);

  const now = new Date();

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );

  const end = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("group_id", groupId)
    .gte("transaction_date", start.toISOString())
    .lte("transaction_date", end.toISOString());

  if (error) throw error;

  const expenses = (data || []).filter(
    (r) => r.type === "expense"
  );

  const incomes = (data || []).filter(
    (r) => r.type === "income"
  );

  const expenseTotal = expenses.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const incomeTotal = incomes.reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  return (
    `📊 本月統計\n\n` +
    `💵 收入：$${incomeTotal.toLocaleString()}\n` +
    `💸 支出：$${expenseTotal.toLocaleString()}\n` +
    `📈 結餘：$${(
      incomeTotal - expenseTotal
    ).toLocaleString()}`
  );
}

// =========================
// LINE 回覆
// =========================

async function replyMessage(replyToken, text) {
  const response = await fetch(
    "https://api.line.me/v2/bot/message/reply",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
      },
      body: JSON.stringify({
        replyToken,
        messages: [
          {
            type: "text",
            text
          }
        ]
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("LINE 回覆失敗：", errorText);
  }
}

// =========================
// 幫助
// =========================

function getHelpMessage() {
  return (
    `💰 錢錢研究所使用方式\n\n` +
    `📝 記帳\n` +
    `晚餐600\n` +
    `晚餐600 KC付\n\n` +
    `📅 查詢\n` +
    `今天\n` +
    `本月\n` +
    `統計\n\n` +
    `💵 收入\n` +
    `收入 薪水30000\n\n` +
    `💸 轉帳\n` +
    `我給KC500`
  );
}

// =========================
// Webhook
// =========================

app.post("/webhook", async (req, res) => {
  console.log("收到 LINE Webhook：", req.body);

  res.sendStatus(200);

  try {
    const events = req.body.events || [];

    for (const event of events) {
      if (event.type !== "message") {
        continue;
      }

      if (event.message.type !== "text") {
        continue;
      }

      const text = event.message.text.trim();

      console.log("收到訊息：", text);

      // 幫助
      if (text === "幫助" || text === "help") {
        await replyMessage(
          event.replyToken,
          getHelpMessage()
        );
        continue;
      }

      // 今天
      if (text === "今天") {
        const result = await getTodaySummary(event);

        await replyMessage(
          event.replyToken,
          result
        );

        continue;
      }

      // 本月
      if (text === "本月") {
        const result = await getMonthSummary(event);

        await replyMessage(
          event.replyToken,
          result
        );

        continue;
      }

      // 統計
      if (text === "統計") {
        const result = await getStatistics(event);

        await replyMessage(
          event.replyToken,
          result
        );

        continue;
      }

      // 收入
      const income = parseIncome(text);

      if (income) {
        await saveIncome(
          event,
          income.item,
          income.amount
        );

        await replyMessage(
          event.replyToken,
          `💵 收入已記帳\n\n${income.item} $${income.amount.toLocaleString()}`
        );

        continue;
      }

      // 轉帳
      const transfer = parseTransfer(text);

      if (transfer) {
        await saveTransfer(
          event,
          transfer.to,
          transfer.amount
        );

        await replyMessage(
          event.replyToken,
          `💸 已記錄轉帳\n\n給${transfer.to} $${transfer.amount.toLocaleString()}`
        );

        continue;
      }

      // =========================
      // 支出記帳
      // =========================

      const lines = text
        .split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean);

      const parsedRecords = [];

      for (const line of lines) {
        const parsed = parseExpenseLine(line);

        if (!parsed) {
          continue;
        }

        const payerName = hasKCPayer(line)
          ? "KC"
          : await getDisplayName(getUserId(event));

        const category = detectCategory(parsed.item);

        parsedRecords.push({
          ...parsed,
          category,
          payerName
        });
      }

      // 沒有解析到任何記帳內容
      if (parsedRecords.length === 0) {
        await replyMessage(
          event.replyToken,
          `🤔 我看不懂這筆記帳\n\n例如：\n晚餐600\n晚餐600 KC付`
        );

        continue;
      }

      // 寫入 Supabase
      for (const record of parsedRecords) {
        await saveExpense({
          event,
          item: record.item,
          amount: record.amount,
          category: record.category,
          payerName: record.payerName
        });
      }

      // 回覆
      let reply = `✅ 已記帳\n\n`;

      parsedRecords.forEach((record) => {
        reply += `🍴 ${record.item} $${record.amount.toLocaleString()}\n`;
        reply += `💳 ${record.payerName} 付款\n\n`;
      });

      await replyMessage(
        event.replyToken,
        reply.trim()
      );
    }
  } catch (error) {
    console.error("Webhook 處理錯誤：", error);
  }
});

// =========================
// 首頁
// =========================

app.get("/", (req, res) => {
  res.send("錢錢研究所💰 已啟動！");
});

// =========================
// 啟動
// =========================

app.listen(PORT, () => {
  console.log(`錢錢研究所💰 啟動於 port ${PORT}`);
});
