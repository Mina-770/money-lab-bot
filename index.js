const express = require("express");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("錢錢研究所 🪙 已啟動！");
});

app.post("/webhook", (req, res) => {
  console.log("收到 LINE Webhook：", req.body);

  res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`錢錢研究所正在運作，Port: ${PORT}`);
});
