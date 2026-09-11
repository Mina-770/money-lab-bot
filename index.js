const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

// ====================
// Supabase
// ====================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

// ====================
// 分類設定
// ====================

const categories = [
  {
    name: "飲食",
    emoji: "🍴",
    keywords: [
      "早餐", "午餐", "晚餐", "吃飯", "便當", "火鍋", "燒肉",
      "拉麵", "麵", "飯", "早餐店", "餐廳", "小吃", "宵夜",
      "飲料", "手搖", "珍奶", "咖啡", "茶", "可樂", "麥當勞",
      "肯德基", "星巴克", "全家", "7-11", "711"
    ]
  },
  {
    name: "運動",
    emoji: "💪",
    keywords: [
      "健身", "健身房", "重訓", "運動", "羽球", "籃球", "網球",
      "游泳", "瑜伽", "瑜珈", "跑步", "球場", "教練", "課程"
    ]
  },
  {
    name: "日用品",
    emoji: "🛒",
    keywords: [
      "全聯", "家樂福", "大潤發", "好市多", "costco",
      "日用品", "生活用品", "衛生紙", "洗衣精", "洗髮精",
      "沐浴乳", "牙膏", "清潔用品", "用品"
    ]
  },
  {
    name: "交通",
    emoji: "🚗",
    keywords: [
      "捷運", "公車", "火車", "高鐵", "計程車", "uber", "油錢",
      "加油", "停車", "停車費", "車資", "機車", "汽油", "交通"
    ]
  },
  {
    name: "房租",
    emoji: "🏠",
    keywords: [
      "房租", "租金", "租屋", "房貸"
    ]
  },
  {
    name: "醫療",
    emoji: "💊",
    keywords: [
      "看醫生", "醫生", "醫院", "診所", "掛號", "藥", "藥局",
      "醫療", "看診", "牙醫", "健檢", "檢查"
    ]
  },
  {
    name: "娛樂",
    emoji: "🎮",
    keywords: [
      "電影", "看電影", "遊戲", "遊樂園", "唱歌", "KTV",
      "演唱會", "展覽", "旅遊", "景點", "娛樂", "Switch",
      "PS5", "Steam"
    ]
  },
  {
    name: "服裝",
    emoji: "👗",
    keywords: [
      "衣服", "褲子", "鞋子", "襪子", "衣", "服裝", "包包",
      "帽子", "內衣", "Uniqlo", "GU"
    ]
  },
  {
    name: "社交",
    emoji: "🍺",
    keywords: [
      "聚餐", "聚會", "喝酒", "酒", "請客", "朋友", "同事",
      "社交", "酒吧", "生日聚餐"
    ]
  },
  {
    name: "禮物",
    emoji: "🎁",
    keywords: [
      "禮物", "送禮", "生日禮物", "紅包", "伴手禮"
    ]
  },
  {
    name: "美容",
    emoji: "💈",
    keywords: [
      "剪頭髮", "理髮", "染髮", "燙髮", "美髮", "美容",
      "美甲", "美睫", "按摩", "護膚", "保養", "化妝品",
      "洗頭"
    ]
  },
  {
    name: "其他",
    emoji: "💰",
    keywords: []
  }
];

// ====================
// 自動判斷分類
// ====================

function getCategory(item) {
  const text = item.toLowerCase();

  for (const category of categories) {
    if (category.name === "其他") {
      continue;
    }

    for (const keyword of category.keywords) {
      if (text.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }

  return categories.find(category => category.name === "其他");
}

// ====================
// 取得 LINE 使用者名稱
// ====================

async function getLineProfile(userId) {

  if (!userId) {
    return "未知使用者";
  }

  try {

    const response = await fetch(
      `https://api.line.me/v2/bot/profile/${userId}`,
      {
        headers: {
          "Authorization":
            `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    if (!response.ok) {
      return "未知使用者";
    }

    const profile = await response.json();

    return profile.displayName || "未知使用者";

  } catch (error) {

    console.error("取得 LINE 使用者名稱失敗：", error);

    return "未知使用者";
  }
}

// ====================
// 判斷付款人
// ====================

function getPayer(userId, userName, itemText) {

  const text = itemText.toLowerCase();

  // KC 付款
  if (
    text.includes("kc付") ||
    text.includes("kc 付") ||
    text.includes("kc付款") ||
    text.includes("kc 付款") ||
    text.includes("kc付的") ||
    text.includes("kc 付的")
  ) {
    return {
      userId: "KC",
      name: "KC"
    };
  }

  // 預設：傳訊息的人付款
  return {
    userId,
    name: userName
  };
}

// ====================
// 清理項目名稱
// ====================

function cleanItem(item) {

  return item
    .replace(/KC\s*付(款)?的?/gi, "")
    .replace(/我\s*付(款)?的?/gi, "")
    .trim();
}

// ====================
// LINE Webhook
// ====================

app.post("/webhook", async (req, res) => {

  console.log("收到 LINE Webhook：", req.body);

  const events = req.body.events || [];

  for (const event of events) {

    if (
      event.type !== "message" ||
      event.message.type !== "text"
    ) {
      continue;
    }

    const userMessage = event.message.text.trim();

    console.log("使用者說：", userMessage);

    // ====================
    // 使用者資訊
    // ====================

    const userId =
      event.source?.userId || "unknown";

    const groupId =
      event.source?.groupId ||
      event.source?.roomId ||
      userId;

    const userName =
      await getLineProfile(userId);

    // ====================
    // 一次可以輸入多筆
    // ====================

    const lines = userMessage
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const records = [];
    const invalidLines = [];

    // ====================
    // 解析每一行
    // ====================

    for (const line of lines) {

      const match = line.match(
        /^(.+?)\s*(\d+(?:\.\d+)?)\s*元?(.*)$/i
      );

      if (match) {

        const originalItem = match[1].trim();
        const amount = Number(match[2]);
        const extraText = match[3].trim();

        const fullItemText =
          `${originalItem} ${extraText}`.trim();

        const item = cleanItem(fullItemText);

        const category =
          getCategory(item);

        const payer =
          getPayer(
            userId,
            userName,
            fullItemText
          );

        records.push({
          group_id: groupId,
          user_id: userId,
          user_name: userName,

          payer_user_id:
            payer.userId,

          payer_name:
            payer.name,

          item,
          amount,

          category:
            category.name,

          type: "expense",

          note:
            extraText || null,

          // 目前先記錄為共享帳本
          // 之後會進一步建立群組成員系統
          participants: "shared",

          transaction_date:
            new Date().toISOString()
        });

      } else {

        invalidLines.push(line);
      }
    }

    let replyText = "";

    // ====================
    // 沒有成功解析
    // ====================

    if (records.length === 0) {

      replyText =
        "💰 我還看不懂這筆記帳～\n\n" +
        "可以直接輸入：\n" +
        "🍴 晚餐120\n" +
        "🍴 飲料 50元\n" +
        "🛒 全聯350\n\n" +
        "如果是 KC 付的：\n" +
        "🍴 晚餐600 KC付";

    } else {

      // ====================
      // 寫入 Supabase
      // ====================

      const { error } =
        await supabase
          .from("records")
          .insert(records);

      if (error) {

        console.error(
          "Supabase 寫入失敗：",
          error
        );

        replyText =
          "⚠️ 記帳失敗了！\n\n" +
          "資料庫目前沒有成功收到這筆資料。\n" +
          "請稍後再試。";

      } else {

        // ====================
        // 計算本次合計
        // ====================

        const total =
          records.reduce(
            (sum, record) =>
              sum + record.amount,
            0
          );

        replyText =
          "💰 記帳成功！\n\n";

        for (const record of records) {

          replyText +=
            `${record.category === "飲食" ? "🍴" :
              record.category === "運動" ? "💪" :
              record.category === "日用品" ? "🛒" :
              record.category === "交通" ? "🚗" :
              record.category === "房租" ? "🏠" :
              record.category === "醫療" ? "💊" :
              record.category === "娛樂" ? "🎮" :
              record.category === "服裝" ? "👗" :
              record.category === "社交" ? "🍺" :
              record.category === "禮物" ? "🎁" :
              record.category === "美容" ? "💈" :
              "💰"} ` +
            `${record.item}　` +
            `${record.amount.toLocaleString()} 元\n`;

          if (record.payer_name === "KC") {

            replyText +=
              `　💳 KC 付款\n`;

          } else {

            replyText +=
              `　💳 ${record.payer_name} 付款\n`;
          }
        }

        replyText +=
          "\n━━━━━━━━━━\n";

        replyText +=
          `💰 本次合計　${total.toLocaleString()} 元`;

        if (invalidLines.length > 0) {

          replyText +=
            "\n\n⚠️ 以下內容無法辨識：\n";

          replyText +=
            invalidLines.join("\n");
        }
      }
    }

    // ====================
    // 回覆 LINE
    // ====================

    try {

      const response =
        await fetch(
          "https://api.line.me/v2/bot/message/reply",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "Authorization":
                `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
            },

            body: JSON.stringify({
              replyToken:
                event.replyToken,

              messages: [
                {
                  type: "text",
                  text: replyText
                }
              ]
            })
          }
        );

      const result =
        await response.text();

      console.log(
        "LINE 回覆結果：",
        response.status,
        result
      );

    } catch (error) {

      console.error(
        "LINE 回覆失敗：",
        error
      );
    }
  }

  res.sendStatus(200);
});

// ====================
// 首頁
// ====================

app.get("/", (req, res) => {

  res.send(
    "錢錢研究所💰 已啟動！"
  );
});

// ====================
// 啟動伺服器
// ====================

const PORT =
  process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(
    `錢錢研究所💰 正在運作，Port: ${PORT}`
  );
});
