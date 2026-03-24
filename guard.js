const axios = require('axios');

module.exports = {
  config: {
    name: "guard",
    version: "2.0.0",
    hasPermssion: 1, // অ্যাডমিন বা মডারেটরদের জন্য
    credits: "Gemini AI",
    description: "অটো লিঙ্ক ডিলিট, ১৮+ ডিটেকশন এবং বাল্ক লিঙ্ক ক্লিনার",
    commandCategory: "Admin/Moderation",
    usages: "[all lk un]",
    cooldowns: 5
  },

  // ১. রিয়েল-টাইম গার্ড (লিঙ্ক এবং ১৮+ ডিটেকশন)
  handleEvent: async function ({ api, event, Threads }) {
    const { threadID, messageID, senderID, body, type } = event;
    if (!body) return;

    // লিঙ্ক ডিটেকশন (Regex)
    const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(\.com|\.net|\.org|\.xyz|\.me)/gi;
    
    // ১৮+ কিউওয়ার্ড লিস্ট (আপনার প্রয়োজন মতো আরও যোগ করুন)
    const adultRegex = /porn|sex|xxx|nude|চোদ|মাগি|গালা|ভিডিও/gi;

    if (linkRegex.test(body) || adultRegex.test(body.toLowerCase())) {
      // হাফ সেকেন্ডের আগেই অ্যাকশন
      try {
        await api.unsendMessage(messageID); // মেসেজ আনসেন্ট করা
        api.removeUserFromGroup(senderID, threadID); // ইউজারকে কিক মারা
        api.sendMessage(`⚠️ @${senderID} গ্রুপে লিঙ্ক বা ১৮+ কন্টেন্ট শেয়ার করায় আপনাকে কিক করা হলো।`, threadID);
      } catch (e) {
        console.log("Error: বটকে গ্রুপের অ্যাডমিন করুন!");
      }
    }
  },

  // ২. বাল্ক লিঙ্ক রিমুভার (১০,০০০ মেসেজ পর্যন্ত)
  run: async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const input = args.join(" ").toLowerCase();

    if (input === "all link un" || input === "all lk un") {
      api.sendMessage("🔍 ১০,০০০ মেসেজ স্ক্যান করা শুরু হচ্ছে... এতে কিছুটা সময় লাগতে পারে।", threadID);

      let count = 0;
      let lastTimestamp = Date.now();
      const limit = 10000; // ১০,০০০ মেসেজ লিমিট
      const perRequest = 500; // প্রতি রিকোয়েস্টে ৫০০ মেসেজ

      async function cleanLinks(timestamp, totalScanned) {
        if (totalScanned >= limit) {
          return api.sendMessage(`✅ স্ক্যান শেষ! মোট ${count}টি লিঙ্ক রিমুভ করা হয়েছে।`, threadID);
        }

        api.getThreadHistory(threadID, perRequest, timestamp, async (err, history) => {
          if (err) return api.sendMessage("হিস্টোরি লোড করতে সমস্যা হয়েছে।", threadID);
          
          if (history.length === 0) return api.sendMessage(`✅ আর কোনো মেসেজ নেই। মোট ${count}টি লিঙ্ক রিমুভ করা হয়েছে।`, threadID);

          for (let msg of history) {
            const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
            if (msg.body && linkRegex.test(msg.body)) {
              api.unsendMessage(msg.messageID);
              count++;
            }
          }

          // পরবর্তী ৫০০ মেসেজের জন্য রিকার্সিভ কল
          let nextTimestamp = history[history.length - 1].timestamp - 1;
          setTimeout(() => cleanLinks(nextTimestamp, totalScanned + perRequest), 1000); 
        });
      }

      cleanLinks(lastTimestamp, 0);
    }

    // ৩. রুলস কমান্ড
    if (input === "rules") {
      const rules = `📜 **গ্রুপের নিয়মাবলী:**\n1. কোনো প্রকার লিঙ্ক শেয়ার করা যাবে না।\n2. ১৮+ কন্টেন্ট বা অশ্লীল ভাষা ব্যবহার নিষিদ্ধ।\n3. নিয়ম ভাঙলে সাথে সাথে কিক দেওয়া হবে।\n\nবট এই নিয়মগুলো স্বয়ংক্রিয়ভাবে পালন করবে।`;
      api.sendMessage(rules, threadID);
    }
  }
};
