const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("錢錢研究所💰 已啟動！");
});

app.post("/webhook", async (req, res) => {
  console.log("收到 LINE Webhook：", req.body);

  const events = req.body.events || [];

  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text.trim();

      console.log("使用者說：", userMessage);

      // 一則訊息可以包含多筆記帳
      const lines = userMessage
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const records = [];
      const invalidLines = [];

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

          records.push({
            item,
            amount
          });
        } else {
          invalidLines.push(line);
        }
      }

      let replyText = "";

      if (records.length > 0) {
        const total = records.reduce(
          (sum, record) => sum + record.amount,
          0
        );

        replyText = "✅ 已記帳\n\n";

        for (const record of records) {
          replyText += `🧾 ${record.item}｜${record.amount} 元\n`;
        }

        replyText += `\n💰 共 ${total} 元`;

        if (invalidLines.length > 0) {
          replyText += "\n\n⚠️ 以下格式看不懂：\n";
          replyText += invalidLines.join("\n");
        }

      } else {
        replyText =
          "我看不懂這筆記帳 😅\n\n" +
          "例如：\n" +
          "晚餐120\n" +
          "晚餐 120\n" +
          "晚餐120元";
      }

      try {
        const response = await fetch(
          "https://api.line.me/v2/bot/message/reply",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${process.env.CHANNEL_ACCESS_TOKEN}`
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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`錢錢研究所💰 正在運作，Port: ${PORT}`);
});
