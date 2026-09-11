const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("錢錢研究所💰 已啟動！");
});

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
      "肯德基", "星巴克", "全家", "7-11", "711", "夜市", "聚餐"
    ]
  },
  {
    name: "運動",
    emoji: "💪",
    keywords: [
      "健身", "健身房", "重訓", "運動", "羽球", "籃球", "網球",
      "游泳", "瑜伽", "跑步", "球場", "教練", "課程"
    ]
  },
  {
    name: "日用品",
    emoji: "🛒",
    keywords: [
      "全聯", "家樂福", "大潤發", "好市多", "costco",
      "日用品", "生活用品", "衛生紙", "洗衣精", "洗髮精",
      "沐浴乳", "牙膏", "清潔用品", "用品", "日用品", "日常用品"
    ]
  },
  {
    name: "交通",
    emoji: "🚗",
    keywords: [
      "捷運", "公車", "火車", "高鐵", "計程車", "uber", "油錢",
      "加油", "停車", "停車費", "車資", "機車", "汽油", "交通", "客運"
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
      "PS5", "Steam", "打保齡球", "湯姆熊", "刮刮樂"
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
// LINE Webhook
// ====================

app.post("/webhook", async (req, res) => {
  console.log("收到 LINE Webhook：", req.body);

  const events = req.body.events || [];

  for (const event of events) {

    if (event.type === "message" && event.message.type === "text") {

      const userMessage = event.message.text.trim();

      console.log("使用者說：", userMessage);

      // 一次可以輸入多筆
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

        // 支援：
        // 晚餐120
        // 晚餐 120
        // 晚餐120元
        // 晚餐 120元
        const match = line.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*元?$/);

        if (match) {

          const item = match[1].trim();
          const amount = Number(match[2]);

          const category = getCategory(item);

          records.push({
            item,
            amount,
            category
          });

        } else {

          invalidLines.push(line);

        }
      }

      let replyText = "";

      // ====================
      // 有成功解析
      // ====================

      if (records.length > 0) {

        const total = records.reduce(
          (sum, record) => sum + record.amount,
          0
        );

        replyText = "💰 記帳成功！\n\n";

        for (const record of records) {

          replyText +=
            `${record.category.emoji} ${record.item}　${record.amount.toLocaleString()} 元\n`;
        }

        replyText += "\n━━━━━━━━━━\n";
        replyText += `💰 本次合計　${total.toLocaleString()} 元`;

        // 有部分看不懂
        if (invalidLines.length > 0) {

          replyText += "\n\n⚠️ 以下內容無法辨識：\n";
          replyText += invalidLines.join("\n");

        }

      } else {

        replyText =
          "💰 我還看不懂這筆記帳～\n\n" +
          "可以直接輸入：\n" +
          "🍴 晚餐120\n" +
          "🍴 飲料 50元\n" +
          "🛒 全聯350";

      }

      // ====================
      // 回覆 LINE
      // ====================

      try {

        const response = await fetch(
          "https://api.line.me/v2/bot/message/reply",
          {
            method: "POST",

            headers: {
              "Content-Type": "application/json",
              "Authorization":
                `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
            },

            body: JSON.stringify({
              replyToken: event.replyToken,

              messages: [
                {
                  type: "text",
                  text: replyText
                }
              ]
            })
          }
        );

        const result = await response.text();

        console.log(
          "LINE 回覆結果：",
          response.status,
          result
        );

      } catch (error) {

        console.error("LINE 回覆失敗：", error);

      }
    }
  }

  res.sendStatus(200);
});

// ====================
// 啟動伺服器
// ====================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `錢錢研究所💰 正在運作，Port: ${PORT}`
  );
});
