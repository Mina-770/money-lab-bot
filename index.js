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
    // 只處理文字訊息
    if (event.type === "message" && event.message.type === "text") {
      const userMessage = event.message.text.trim();

      console.log("使用者說：", userMessage);

      // 嘗試抓取最後面的金額
      const match = userMessage.match(/^(.+?)\s+(\d+(?:\.\d+)?)$/);

      let replyText;

      if (match) {
        const item = match[1];
        const amount = match[2];

        replyText = `✅ 已記帳\n${item}｜${amount} 元`;
      } else {
        replyText = `我看不懂這筆記帳 😅\n請用「項目 金額」的格式，例如：\n晚餐 120`;
      }

      try {
        const response = await fetch("https://api.line.me/v2/bot/message/reply", {
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
        });

        const result = await response.text();

        console.log("LINE 回覆結果：", response.status, result);

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
