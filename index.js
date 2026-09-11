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
      const userMessage = event.message.text;

      console.log("使用者說：", userMessage);

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
                text: `收到！你說的是：「${userMessage}」💰`
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
