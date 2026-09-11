const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const CHANNEL_ACCESS_TOKEN = process.env.CHANNEL_ACCESS_TOKEN;
const CHANNEL_SECRET = process.env.CHANNEL_SECRET;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY
);


// ============================================================
// 分類
// ============================================================

const CATEGORIES = [
  "🍴 飲食",
  "💪 運動",
  "🛒 日用品",
  "🚗 交通",
  "🏠 房租",
  "💊 醫療",
  "🎮 娛樂",
  "👗 服裝",
  "🍺 社交",
  "🎁 禮物",
  "💈 美容",
  "💰 其他"
];

function getCategory(item) {
  const text = item.toLowerCase();

  if (
    text.includes("吃") ||
    text.includes("餐") ||
    text.includes("飯") ||
    text.includes("麵") ||
    text.includes("早餐") ||
    text.includes("午餐") ||
    text.includes("晚餐") ||
    text.includes("飲料") ||
    text.includes("咖啡") ||
    text.includes("手搖") ||
    text.includes("便當") ||
    text.includes("早餐")
  ) {
    return "🍴 飲食";
  }

  if (
    text.includes("健身") ||
    text.includes("運動") ||
    text.includes("羽球") ||
    text.includes("籃球") ||
    text.includes("足球") ||
    text.includes("游泳") ||
    text.includes("瑜伽") ||
    text.includes("教練") ||
    text.includes("健身房")
  ) {
    return "💪 運動";
  }

  if (
    text.includes("衛生紙") ||
    text.includes("洗衣") ||
    text.includes("清潔") ||
    text.includes("日用品") ||
    text.includes("生活用品") ||
    text.includes("洗髮") ||
    text.includes("沐浴")
  ) {
    return "🛒 日用品";
  }

  if (
    text.includes("捷運") ||
    text.includes("公車") ||
    text.includes("火車") ||
    text.includes("高鐵") ||
    text.includes("計程車") ||
    text.includes("油錢") ||
    text.includes("停車") ||
    text.includes("加油")
  ) {
    return "🚗 交通";
  }

  if (
    text.includes("房租") ||
    text.includes("租金")
  ) {
    return "🏠 房租";
  }

  if (
    text.includes("看醫生") ||
    text.includes("醫院") ||
    text.includes("診所") ||
    text.includes("藥") ||
    text.includes("醫療")
  ) {
    return "💊 醫療";
  }

  if (
    text.includes("遊戲") ||
    text.includes("電影") ||
    text.includes("唱歌") ||
    text.includes("ktv") ||
    text.includes("娛樂") ||
    text.includes("展覽")
  ) {
    return "🎮 娛樂";
  }

  if (
    text.includes("衣服") ||
    text.includes("鞋") ||
    text.includes("褲") ||
    text.includes("外套") ||
    text.includes("服裝")
  ) {
    return "👗 服裝";
  }

  if (
    text.includes("聚餐") ||
    text.includes("聚會") ||
    text.includes("社交") ||
    text.includes("請客")
  ) {
    return "🍺 社交";
  }

  if (
    text.includes("禮物") ||
    text.includes("生日")
  ) {
    return "🎁 禮物";
  }

  if (
    text.includes("剪髮") ||
    text.includes("美髮") ||
    text.includes("染髮") ||
    text.includes("美容") ||
    text.includes("美甲")
  ) {
    return "💈 美容";
  }

  return "💰 其他";
}


// ============================================================
// LINE 使用者
// ============================================================

async function getUserProfile(userId) {
  try {
    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return userId;
    }

    const data = await response.json();

    return data.displayName || userId;

  } catch (error) {
    console.error("取得 LINE 使用者資料失敗：", error);
    return userId;
  }
}


// ============================================================
// LINE 回覆
// ============================================================

async function replyMessage(replyToken, text) {
  try {
    const response = await fetch(
      "https://api.line.me/v2/bot/message/reply",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
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

  } catch (error) {
    console.error("LINE 回覆錯誤：", error);
  }
}


// ============================================================
// 台灣時間
// ============================================================

function getTaiwanDateString(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function getTaiwanMonthString(date = new Date()) {
  const dateString = getTaiwanDateString(date);
  return dateString.substring(0, 7);
}

function getTaiwanTodayRange() {
  const today = getTaiwanDateString();

  const start = new Date(
    `${today}T00:00:00+08:00`
  );

  const end = new Date(
    start.getTime() + 24 * 60 * 60 * 1000
  );

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function getTaiwanMonthRange() {
  const month = getTaiwanMonthString();

  const start = new Date(
    `${month}-01T00:00:00+08:00`
  );

  const nextMonth = new Date(start);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  return {
    start: start.toISOString(),
    end: nextMonth.toISOString()
  };
}


// ============================================================
// 付款人
// ============================================================

function parsePayer(text, defaultUserId, defaultUserName) {
  let payerUserId = defaultUserId;
  let payerName = defaultUserName;

  if (
    /KC\s*付/.test(text) ||
    /KC\s*付款/.test(text) ||
    /KC\s*付的/.test(text)
  ) {
    payerUserId = "KC";
    payerName = "KC";
  }

  return {
    payerUserId,
    payerName
  };
}


// ============================================================
// 清除付款人文字
// ============================================================

function cleanPayerText(text) {
  return text
    .replace(/KC\s*付款/g, "")
    .replace(/KC\s*付的/g, "")
    .replace(/KC\s*付/g, "")
    .trim();
}


// ============================================================
// 一般記帳解析
// ============================================================

function parseExpenseLine(line) {
  const match = line.match(
    /^(.+?)\s*(\d+(?:\.\d+)?)\s*元?$/
  );

  if (!match) {
    return null;
  }

  let item = match[1].trim();
  const amount = Number(match[2]);

  item = cleanPayerText(item);

  if (!item || !amount) {
    return null;
  }

  return {
    item,
    amount
  };
}


// ============================================================
// 指令判斷
// ============================================================

function isTodayCommand(text) {
  return [
    "今天",
    "今日",
    "今天記帳",
    "今日記帳"
  ].includes(text.trim());
}

function isMonthCommand(text) {
  return [
    "本月",
    "這個月",
    "這月",
    "本月記帳"
  ].includes(text.trim());
}

function isStatsCommand(text) {
  return [
    "統計",
    "支出統計",
    "本月統計"
  ].includes(text.trim());
}


// ============================================================
// 查詢資料
// ============================================================

async function getRecordsByRange(
  groupId,
  start,
  end
) {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("group_id", groupId)
    .gte("transaction_date", start)
    .lt("transaction_date", end)
    .order("transaction_date", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return data || [];
}


// ============================================================
// 今天
// ============================================================

async function getTodayRecords(groupId) {
  const { start, end } = getTaiwanTodayRange();

  return await getRecordsByRange(
    groupId,
    start,
    end
  );
}

function formatTodayRecords(records) {
  const expenses = records.filter(
    record => record.type === "expense"
  );

  if (expenses.length === 0) {
    return "🧾 今天還沒有記帳喔～";
  }

  let total = 0;

  const lines = expenses.map(record => {
    total += Number(record.amount);

    return `${record.category} ${record.item} $${Number(
      record.amount
    ).toLocaleString()}｜${record.payer_name}付`;
  });

  return [
    "🧾 今日記帳",
    "",
    ...lines,
    "",
    `💰 今日支出 $${total.toLocaleString()}`
  ].join("\n");
}


// ============================================================
// 本月
// ============================================================

async function getMonthRecords(groupId) {
  const { start, end } = getTaiwanMonthRange();

  return await getRecordsByRange(
    groupId,
    start,
    end
  );
}

function formatMonthRecords(records) {
  const expenses = records.filter(
    record => record.type === "expense"
  );

  if (expenses.length === 0) {
    return "📅 本月還沒有支出喔～";
  }

  const total = expenses.reduce(
    (sum, record) =>
      sum + Number(record.amount),
    0
  );

  return [
    "📅 本月支出",
    "",
    `💰 總支出 $${total.toLocaleString()}`,
    `🧾 共 ${expenses.length} 筆`,
    "",
    "📊 分類：",
    formatCategorySummary(expenses)
  ].join("\n");
}


// ============================================================
// 分類統計
// ============================================================

function formatCategorySummary(records) {
  const categoryTotals = {};

  for (const record of records) {
    const category = record.category || "💰 其他";

    if (!categoryTotals[category]) {
      categoryTotals[category] = 0;
    }

    categoryTotals[category] += Number(record.amount);
  }

  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([category, amount]) =>
        `${category} $${amount.toLocaleString()}`
    )
    .join("\n");
}


// ============================================================
// 統計
// ============================================================

function formatStats(records) {
  const expenses = records.filter(
    record => record.type === "expense"
  );

  const incomes = records.filter(
    record => record.type === "income"
  );

  const expenseTotal = expenses.reduce(
    (sum, record) =>
      sum + Number(record.amount),
    0
  );

  const incomeTotal = incomes.reduce(
    (sum, record) =>
      sum + Number(record.amount),
    0
  );

  return [
    "📊 本月統計",
    "",
    `💵 收入 $${incomeTotal.toLocaleString()}`,
    `💸 支出 $${expenseTotal.toLocaleString()}`,
    `💰 差額 $${(
      incomeTotal - expenseTotal
    ).toLocaleString()}`,
    "",
    "分類支出：",
    expenses.length
      ? formatCategorySummary(expenses)
      : "目前沒有支出"
  ].join("\n");
}


// ============================================================
// 分類查詢
// ============================================================

function findCategory(text) {
  return CATEGORIES.find(
    category => text.trim() === category
  );
}

async function getCategoryRecords(
  groupId,
  category
) {
  const { start, end } = getTaiwanMonthRange();

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("group_id", groupId)
    .eq("type", "expense")
    .eq("category", category)
    .gte("transaction_date", start)
    .lt("transaction_date", end)
    .order("transaction_date", {
      ascending: true
    });

  if (error) {
    throw error;
  }

  return data || [];
}

function formatCategoryRecords(
  category,
  records
) {
  if (records.length === 0) {
    return `${category}\n\n本月還沒有這類支出喔～`;
  }

  const total = records.reduce(
    (sum, record) =>
      sum + Number(record.amount),
    0
  );

  const lines = records.map(record =>
    `${record.item} $${Number(
      record.amount
    ).toLocaleString()}｜${record.payer_name}付`
  );

  return [
    `${category}｜本月`,
    "",
    ...lines,
    "",
    `💰 共 $${total.toLocaleString()}`
  ].join("\n");
}


// ============================================================
// 收入
// ============================================================
//
// 用法：
// 薪水30000
// 收入 薪水30000
//
// ============================================================

function parseIncome(text) {
  let cleanText = text.trim();

  cleanText = cleanText
    .replace(/^收入\s*/i, "")
    .trim();

  const match = cleanText.match(
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

function isIncomeCommand(text) {
  return /^收入\s*/.test(text);
}


// ============================================================
// 轉帳
// ============================================================
//
// 用法：
// 我給KC500
// 我給 KC 500
//
// ============================================================

function parseTransfer(text) {
  const match = text.match(
    /^我給\s*([^\d\s]+)\s*(\d+(?:\.\d+)?)\s*元?$/
  );

  if (!match) {
    return null;
  }

  const toName = match[1].trim();
  const amount = Number(match[2]);

  if (!toName || !amount) {
    return null;
  }

  return {
    toName,
    amount
  };
}


// ============================================================
// 儲存收入
// ============================================================

async function saveIncome(
  groupId,
  userId,
  userName,
  item,
  amount
) {
  const record = {
    group_id: groupId,
    user_id: userId,
    user_name: userName,
    payer_user_id: userId,
    payer_name: userName,
    item,
    amount,
    category: "💰 其他",
    type: "income",
    note: "收入",
    participants: userName,
    transaction_date: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("records")
    .insert(record)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// 儲存轉帳
// ============================================================

async function saveTransfer(
  groupId,
  userId,
  userName,
  toName,
  amount
) {
  const record = {
    group_id: groupId,
    user_id: userId,
    user_name: userName,
    payer_user_id: userId,
    payer_name: userName,
    item: `轉給${toName}`,
    amount,
    category: "💰 其他",
    type: "transfer",
    note: `我給${toName}`,
    participants: toName,
    transaction_date: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("records")
    .insert(record)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// 儲存支出
// ============================================================

async function saveExpense(
  groupId,
  userId,
  userName,
  record,
  originalText
) {
  const {
    payerUserId,
    payerName
  } = parsePayer(
    originalText,
    userId,
    userName
  );

  const category = getCategory(record.item);

  const newRecord = {
    group_id: groupId,
    user_id: userId,
    user_name: userName,
    payer_user_id: payerUserId,
    payer_name: payerName,
    item: record.item,
    amount: record.amount,
    category,
    type: "expense",
    note: originalText,
    participants: "shared",
    transaction_date: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from("records")
    .insert(newRecord)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}


// ============================================================
// 支出回覆
// ============================================================

function formatSavedExpenses(records) {
  const lines = records.map(record =>
    `${record.category} ${record.item} $${Number(
      record.amount
    ).toLocaleString()}｜${record.payer_name}付`
  );

  const total = records.reduce(
    (sum, record) =>
      sum + Number(record.amount),
    0
  );

  return [
    "✅ 記帳成功！",
    "",
    ...lines,
    "",
    `💰 本次共 $${total.toLocaleString()}`
  ].join("\n");
}


// ============================================================
// 說明
// ============================================================

function getHelpMessage() {
  return [
    "💰 錢錢研究所",
    "",
    "📝 記帳",
    "晚餐120",
    "晚餐600 KC付",
    "",
    "🔎 查帳",
    "今天",
    "本月",
    "統計",
    "",
    "📊 分類",
    "🍴 飲食",
    "💪 運動",
    "🛒 日用品",
    "🚗 交通",
    "🏠 房租",
    "💊 醫療",
    "🎮 娛樂",
    "👗 服裝",
    "🍺 社交",
    "🎁 禮物",
    "💈 美容",
    "",
    "💵 收入",
    "收入 薪水30000",
    "",
    "🔄 轉帳",
    "我給KC500"
  ].join("\n");
}


// ============================================================
// Webhook
// ============================================================

app.post("/webhook", async (req, res) => {
  console.log("收到 LINE Webhook：", req.body);

  res.status(200).send("OK");

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

      const userId = event.source.userId;

      const groupId =
        event.source.groupId ||
        event.source.roomId ||
        userId;

      const userName =
        await getUserProfile(userId);


      // ======================================================
      // HELP
      // ======================================================

      if (
        text === "幫助" ||
        text === "說明" ||
        text === "功能"
      ) {
        await replyMessage(
          event.replyToken,
          getHelpMessage()
        );

        continue;
      }


      // ======================================================
      // 今天
      // ======================================================

      if (isTodayCommand(text)) {
        try {
          const records =
            await getTodayRecords(groupId);

          await replyMessage(
            event.replyToken,
            formatTodayRecords(records)
          );

        } catch (error) {
          console.error(
            "查詢今天失敗：",
            error
          );

          await replyMessage(
            event.replyToken,
            "😵 查詢今天記帳時發生問題。"
          );
        }

        continue;
      }


      // ======================================================
      // 本月
      // ======================================================

      if (isMonthCommand(text)) {
        try {
          const records =
            await getMonthRecords(groupId);

          await replyMessage(
            event.replyToken,
            formatMonthRecords(records)
          );

        } catch (error) {
          console.error(
            "查詢本月失敗：",
            error
          );

          await replyMessage(
            event.replyToken,
            "😵 查詢本月記帳時發生問題。"
          );
        }

        continue;
      }


      // ======================================================
      // 統計
      // ======================================================

      if (isStatsCommand(text)) {
        try {
          const records =
            await getMonthRecords(groupId);

          await replyMessage(
            event.replyToken,
            formatStats(records)
          );

        } catch (error) {
          console.error(
            "統計失敗：",
            error
          );

          await replyMessage(
            event.replyToken,
            "😵 統計時發生問題。"
          );
        }

        continue;
      }


      // ======================================================
      // 分類查詢
      // ======================================================

      const category =
        findCategory(text);

      if (category) {
        try {
          const records =
            await getCategoryRecords(
              groupId,
              category
            );

          await replyMessage(
            event.replyToken,
            formatCategoryRecords(
              category,
              records
            )
          );

        } catch (error) {
          console.error(
            "分類查詢失敗：",
            error
          );

          await replyMessage(
            event.replyToken,
            "😵 查詢分類時發生問題。"
          );
        }

        continue;
      }


      // ======================================================
      // 收入
      // ======================================================

      if (isIncomeCommand(text)) {
        const income =
          parseIncome(text);

        if (!income) {
          await replyMessage(
            event.replyToken,
            "💵 收入格式可以這樣打：\n\n收入 薪水30000"
          );

          continue;
        }

        try {
          await saveIncome(
            groupId,
            userId,
            userName,
            income.item,
            income.amount
          );

          await replyMessage(
            event.replyToken,
            [
              "✅ 收入記錄成功！",
              "",
              `💵 ${income.item} $${income.amount.toLocaleString()}`,
              `👤 ${userName}`
            ].join("\n")
          );

        } catch (error) {
          console.error(
            "收入儲存失敗：",
            error
          );

          await replyMessage(
            event.replyToken,
            "😵 收入儲存失敗。"
          );
        }

        continue;
      }


      // ======================================================
      // 轉帳
      // ======================================================

      const transfer =
        parseTransfer(text);

      if (transfer) {
        try {
          await saveTransfer(
            groupId,
            userId,
            userName,
            transfer.toName,
            transfer.amount
          );

          await replyMessage(
            event.replyToken,
            [
              "✅ 轉帳記錄成功！",
              "",
              `👤 ${userName}`,
              `➡️ ${transfer.toName}`,
              `💰 $${transfer.amount.toLocaleString()}`
            ].join("\n")
          );

        } catch (error) {
          console.error(
            "轉帳儲存失敗：",
            error
          );

          await replyMessage(
            event.replyToken,
            "😵 轉帳儲存失敗。"
          );
        }

        continue;
      }


      // ======================================================
      // 一般記帳
      // ======================================================

      const lines = text
        .split("\n")
        .map(line => line.trim())
        .filter(Boolean);

      const parsedRecords = [];

      for (const line of lines) {
        const parsed =
          parseExpenseLine(line);

        if (parsed) {
          parsedRecords.push(parsed);
        }
      }

      if (parsedRecords.length === 0) {
        continue;
      }


      // ======================================================
      // 儲存多筆支出
      // ======================================================

      const savedRecords = [];

      try {
        for (const record of parsedRecords) {
          const saved =
            await saveExpense(
              groupId,
              userId,
              userName,
              record,
              text
            );

          savedRecords.push(saved);
        }

        await replyMessage(
          event.replyToken,
          formatSavedExpenses(
            savedRecords
          )
        );

      } catch (error) {
        console.error(
          "支出儲存失敗：",
          error
        );

        await replyMessage(
          event.replyToken,
          "😵 記帳失敗，資料沒有成功存入資料庫。"
        );
      }
    }

  } catch (error) {
    console.error(
      "Webhook 處理錯誤：",
      error
    );
  }
});


// ============================================================
// 首頁
// ============================================================

app.get("/", (req, res) => {
  res.send(
    "錢錢研究所💰 已啟動！"
  );
});


// ============================================================
// 啟動
// ============================================================

app.listen(PORT, () => {
  console.log(
    `錢錢研究所💰 啟動於 port ${PORT}`
  );
});
