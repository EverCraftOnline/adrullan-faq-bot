const knowledgeLoader = require('../lib/knowledgeLoader');

// Quiz question templates organized by category
const questionTemplates = {
  lore: [
    {
      template: "Who is the Prime God of {aspect}?",
      extractor: (doc) => {
        const aspectMatch = doc.content.match(/(\w+) Aspect - Gods and Champions/);
        const primeGodMatch = doc.content.match(/- (\w+) the \w+ \(Prime God\)/);
        return aspectMatch && primeGodMatch ? {
          aspect: aspectMatch[1],
          answer: primeGodMatch[1],
          fullAnswer: primeGodMatch[0]
        } : null;
      }
    },
    {
      template: "What is the title of {godName}?",
      extractor: (doc) => {
        const godMatches = doc.content.match(/- (\w+) the (\w+)/g);
        if (godMatches) {
          const randomGod = godMatches[Math.floor(Math.random() * godMatches.length)];
          const [, name, title] = randomGod.match(/- (\w+) the (\w+)/);
          return { godName: name, answer: title, fullAnswer: randomGod };
        }
        return null;
      }
    },
    {
      template: "Who is the Champion of {godName}?",
      extractor: (doc) => {
        const championMatches = doc.content.match(/- (\w+) the \w+ - Champion: (\w+)/g);
        if (championMatches) {
          const randomChampion = championMatches[Math.floor(Math.random() * championMatches.length)];
          const [, godName, champion] = randomChampion.match(/- (\w+) the \w+ - Champion: (\w+)/);
          return { godName, answer: champion, fullAnswer: randomChampion };
        }
        return null;
      }
    },
    {
      template: "What are the six aspects in Adrullan?",
      extractor: (doc) => {
        if (doc.id === 'six_aspects_overview') {
          return {
            answer: "Fire, Water, Earth, Air, Light, Dark",
            fullAnswer: "The six aspects are Fire, Water, Earth, Air, Light, and Dark"
          };
        }
        return null;
      }
    },
    {
      template: "What is the name of the heretical wizard trying to create a 7th Aspect?",
      extractor: (doc) => {
        if (doc.content.includes('Ludos')) {
          return {
            answer: "Ludos",
            fullAnswer: "Ludos the Unbound"
          };
        }
        return null;
      }
    }
  ],
  philosophy: [
    {
      template: "What is the name of the central hub players reach around level 15?",
      extractor: (doc) => {
        if (doc.content.includes("anatma")) {
          return {
            answer: "Anatma's Point",
            fullAnswer: "Anatma's Point (working name)"
          };
        }
        return null;
      }
    },    
  ],
  general: [
    {
      template: "What type of world does Adrullan Online Adventures feature?",
      extractor: (doc) => {
        if (doc.content.includes('voxel')) {
          return {
            answer: "Voxel world",
            fullAnswer: "A massive, seamless, voxel world"
          };
        }
        return null;
      }
    },
    {
      template: "What's the name of the company behind Adrullan Online Adventures?",
      extractor: (doc) => {
        if (doc.content.includes('hiddentree')) {
          return {
            answer: "Hiddentree Entertainment Inc",
            fullAnswer: "Hiddentree Entertainment Inc"
          };
        }
        return null;
      }
    }
  ]
};

// Active quiz state
let activeQuiz = null;

module.exports = {
  async execute(message) {
    const args = message.content.replace('!quiz', '').trim().split(' ');
    const subcommand = args[0]?.toLowerCase();

    if (subcommand === 'stop' && activeQuiz) {
      activeQuiz = null;
      return message.reply('🎯 Quiz stopped! No more questions will be asked.');
    }

    if (activeQuiz) {
      return message.reply('🎯 A quiz is already active! Use `!quiz stop` to end it first.');
    }

    try {
      // Load knowledge base
      const knowledgeBase = await knowledgeLoader.loadAll();
      
      if (knowledgeBase.length === 0) {
        return message.reply('❌ No knowledge base found. Cannot generate quiz questions.');
      }

      // Generate a random question
      const question = generateRandomQuestion(knowledgeBase);
      
      if (!question) {
        return message.reply('❌ Could not generate a quiz question from the current knowledge base.');
      }

      // Set up active quiz
      activeQuiz = {
        question: question.question,
        answer: question.answer.toLowerCase(),
        fullAnswer: question.fullAnswer,
        channel: message.channel,
        startTime: Date.now(),
        attempts: 0
      };

      // Send the question
      const quizMessage = await message.reply(`🎯 **QUIZ TIME!** 🎯\n\n**Question:** ${question.question}\n\n*First person to answer correctly wins!*`);
      
      // Set up answer collector
      const collector = message.channel.createMessageCollector({
        filter: (msg) => !msg.author.bot && msg.content.toLowerCase().includes(activeQuiz.answer),
        time: 60000 // 1 minute timeout
      });

      collector.on('collect', (answerMsg) => {
        if (activeQuiz && answerMsg.content.toLowerCase().includes(activeQuiz.answer)) {
          const timeTaken = Math.round((Date.now() - activeQuiz.startTime) / 1000);
          const attempts = activeQuiz.attempts + 1;
          
          answerMsg.reply(`🎉 **CORRECT!** 🎉\n\n**${answerMsg.author.username}** got it right!\n**Answer:** ${activeQuiz.fullAnswer}\n**Time:** ${timeTaken}s\n**Attempts:** ${attempts}\n\nGreat job! 🏆`);
          
          collector.stop();
          activeQuiz = null;
        } else {
          activeQuiz.attempts++;
        }
      });

      collector.on('end', (collected, reason) => {
        if (activeQuiz && reason === 'time') {
          message.channel.send(`⏰ **Time's up!** The correct answer was: **${activeQuiz.fullAnswer}**\n\nBetter luck next time! 🎯`);
          activeQuiz = null;
        }
      });

    } catch (error) {
      console.error('Quiz command error:', error);
      await message.reply('Sorry, I encountered an error generating the quiz question. Please try again later.');
    }
  }
};

function generateRandomQuestion(knowledgeBase) {
  const allTemplates = [];
  
  // Collect all question templates
  Object.values(questionTemplates).forEach(templates => {
    allTemplates.push(...templates);
  });

  // Try to generate a question from each template
  for (let i = 0; i < 50; i++) { // Try up to 50 times to find a valid question
    const template = allTemplates[Math.floor(Math.random() * allTemplates.length)];
    const category = Object.keys(questionTemplates).find(cat => 
      questionTemplates[cat].includes(template)
    );
    
    // Find relevant documents for this category
    const relevantDocs = knowledgeBase.filter(doc => {
      if (category === 'lore') return doc.category === 'lore';
      if (category === 'philosophy') return doc.category === 'philosophy';
      return true; // general
    });

    if (relevantDocs.length === 0) continue;

    // Try to extract question data from each relevant document
    for (const doc of relevantDocs) {
      const data = template.extractor(doc);
      if (data) {
        return {
          question: template.template.replace(/\{(\w+)\}/g, (match, key) => data[key] || match),
          answer: data.answer,
          fullAnswer: data.fullAnswer,
          category: category
        };
      }
    }
  }

  return null;
}
