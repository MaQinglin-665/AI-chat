(function (root) {
  "use strict";

  const MOOD_KEYWORDS = {
    happy: [
      "哈哈", "嘻嘻", "笑死", "开心", "高兴", "太好了", "太棒了", "不错", "喜欢",
      "爱你", "赞", "可爱", "有意思", "好玩", "真好", "厉害", "稳", "6", "666",
      "yyds", "hhh", "lol", "lmao", "haha", "yay", "nice", "cool", "amazing", "wonderful",
      "fantastic", "excited", "great", "awesome", "sweet", "happy", "love", "cheerful"
    ],
    sad: [
      "唉", "哭", "难过", "伤心", "失落", "遗憾", "心疼", "无语", "累了",
      "好累", "不想", "算了", "躺平", "寂寞", "孤独", "没意思", "无聊", "好烦", "emo",
      "破防", "心累", "麻了", "废了", "摆烂", "低落", "委屈", "崩溃", "疲惫", "sad",
      "sorry", "upset", "tired", "miss", "sigh", "alone", "depressed", "lonely", "blue"
    ],
    angry: [
      "烦", "草", "卧槽", "我去", "气死", "火大", "烦死", "讨厌", "闭嘴",
      "够了", "受不了", "离谱", "过分", "太过分", "可恶", "气炸", "炸了",
      "tmd", "wtf", "damn", "shut up", "hate", "pissed", "furious", "annoyed", "angry", "mad",
      "rage", "生气", "恼火", "暴躁"
    ],
    surprised: [
      "啊", "卧槽", "我去", "天哪", "不会吧", "不可能吧", "什么鬼", "啥情况", "真的假的",
      "蛙", "nb", "离谱", "绝了", "不敢相信", "吓死", "震惊", "惊呆", "惊了", "居然",
      "竟然", "omg", "what", "seriously", "no way", "incredible", "unbelievable", "wow", "unexpected",
      "逆天", "神了", "太夸张了", "开玩笑吧"
    ]
  };

  function hasMoodKeyword(text, keywords) {
    for (let i = 0; i < keywords.length; i += 1) {
      const token = String(keywords[i] || "").trim().toLowerCase();
      if (token && text.includes(token)) {
        return true;
      }
    }
    return false;
  }

  function detectMood(text) {
    const s = String(text || "").toLowerCase().trim();
    if (!s) {
      return "idle";
    }
    if (hasMoodKeyword(s, MOOD_KEYWORDS.surprised)) {
      return "surprised";
    }
    if (hasMoodKeyword(s, MOOD_KEYWORDS.angry)) {
      return "angry";
    }
    if (hasMoodKeyword(s, MOOD_KEYWORDS.sad)) {
      return "sad";
    }
    if (hasMoodKeyword(s, MOOD_KEYWORDS.happy)) {
      return "happy";
    }
    return "idle";
  }

  function pickMoodMotionGroups(mood, source = "emotion") {
    let idleGroups = ["Idle"];
    if (source === "idle") {
      idleGroups = ["Idle", "Tap", "FlickUp", "FlickDown"];
    } else if (source === "talk") {
      idleGroups = ["Tap", "FlickUp", "Idle"];
    } else if (source === "tap") {
      idleGroups = ["Tap", "Tap@Body", "FlickUp", "Idle"];
    }
    const map = {
      happy: ["Tap", "Tap@Body", "FlickUp", "Idle"],
      sad: ["FlickDown", "Idle", "Flick"],
      angry: ["Flick@Body", "Flick", "Tap@Body", "Idle"],
      surprised: ["FlickUp", "Tap", "Flick", "Idle"],
      idle: idleGroups
    };
    return map[mood] || map.idle;
  }

  function createController() {
    return { hasMoodKeyword, detectMood, pickMoodMotionGroups };
  }

  const api = { MOOD_KEYWORDS, hasMoodKeyword, detectMood, pickMoodMotionGroups, createController };
  root.TaffyEmotionMoodController = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
