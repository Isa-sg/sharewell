// Personalization templates following social media best practices
const personalizationTemplates = {
  casual: {
    name: "Make it more casual",
    transforms: [
      // Remove dates and emojis first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /[🚀⚡💡🔥✨🎯💻🌟📈🔧⭐🎪📊🛠️🚨📱🔍⚙️🎨🌐🤔🎉]/g, to: "" }, // Remove emojis
      { from: /#\w+/g, to: "" }, // Remove hashtags
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply casual transforms
      { from: /\bwe are\b/gi, to: "we're" },
      { from: /\bdo not\b/gi, to: "don't" },
      { from: /\bcannot\b/gi, to: "can't" },
      { from: /\bwill not\b/gi, to: "won't" },
      { from: /\bit is\b/gi, to: "it's" },
      { from: /\bthat is\b/gi, to: "that's" },
      { from: /\bexcellent\b/gi, to: "awesome" },
      { from: /\bfantastic\b/gi, to: "amazing" },
      { from: /\bUtilize\b/gi, to: "Use" },
      { from: /\butilize\b/gi, to: "use" }
    ],
    prefix: "Hey everyone! ",
    suffix: " What are your thoughts?\n\n[Follow-up] More details: https://ampcode.com/news"
  },
  excited: {
    name: "Add excitement",
    transforms: [
      // Remove dates and emojis first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /[🚀⚡💡🔥✨🎯💻🌟📈🔧⭐🎪📊🛠️🚨📱🔍⚙️🎨🌐🤔🎉]/g, to: "" }, // Remove emojis
      { from: /#\w+/g, to: "" }, // Remove hashtags
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply excitement transforms
      { from: /\bgood\b/gi, to: "amazing" },
      { from: /\bnice\b/gi, to: "incredible" },
      { from: /\binteresting\b/gi, to: "fascinating" },
      { from: /\bfeature\b/gi, to: "game-changing feature" },
      { from: /\bupdate\b/gi, to: "exciting update" },
      { from: /\bimprovement\b/gi, to: "incredible improvement" },
      { from: /\bnew\b/gi, to: "brand new" }
    ],
    prefix: "This is incredible! ",
    suffix: " Can't wait to see what comes next!\n\n[Follow-up] Read more: https://ampcode.com/news"
  },
  professional: {
    name: "Make it professional",
    transforms: [
      // Remove dates and emojis first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /[🚀⚡💡🔥✨🎯💻🌟📈🔧⭐🎪📊🛠️🚨📱🔍⚙️🎨🌐🤔🎉]/g, to: "" }, // Remove emojis
      { from: /#\w+/g, to: "" }, // Remove hashtags
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply professional transforms
      { from: /\bawesome\b/gi, to: "excellent" },
      { from: /\bamazing\b/gi, to: "remarkable" },
      { from: /\bcool\b/gi, to: "impressive" },
      { from: /\bgreat\b/gi, to: "exceptional" },
      { from: /\bsuper\b/gi, to: "highly" },
      { from: /\bhey\b/gi, to: "Hello" },
      { from: /\bguys\b/gi, to: "colleagues" },
      { from: /\btotally\b/gi, to: "completely" }
    ],
    prefix: "From a professional standpoint, ",
    suffix: " This development has significant implications for the industry.\n\n[Follow-up] Technical details: https://ampcode.com/news"
  },
  personal: {
    name: "Make it personal",
    transforms: [
      // Remove dates and emojis first
      { from: /\b[A-Za-z]+ \d{1,2}, \d{4}\b/g, to: "" },
      { from: /\d{4}-\d{2}-\d{2}/g, to: "" },
      { from: /[🚀⚡💡🔥✨🎯💻🌟📈🔧⭐🎪📊🛠️🚨📱🔍⚙️🎨🌐🤔🎉]/g, to: "" }, // Remove emojis
      { from: /#\w+/g, to: "" }, // Remove hashtags
      { from: /\s+/g, to: " " }, // Clean up extra spaces
      // Then apply personal transforms
      { from: /\bwe believe\b/gi, to: "I believe" },
      { from: /\bour team\b/gi, to: "my team and I" },
      { from: /\bwe are\b/gi, to: "I am" },
      { from: /\bwe have\b/gi, to: "I have" }
    ],
    prefix: "In my experience, ",
    suffix: " What has your experience been like? I'd love to hear your perspective!\n\n[Follow-up] Details: https://ampcode.com/news"
  }
};

module.exports = { personalizationTemplates };
