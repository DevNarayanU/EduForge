const RAW_ALLOWED_CHANNELS = [
  // Programming / CS
  "freeCodeCamp.org", "Programming with Mosh", "Traversy Media", "The Net Ninja",
  "Fireship", "Corey Schafer", "Academind", "CodeWithHarry", "Apna College",
  "Tech With Tim", "Bro Code", "Telusko", "Web Dev Simplified", "Codevolution",
  "ThePrimeagen", "Theo - t3.gg", "Hussein Nasser", "NetworkChuck",
  "Nick White", "NeetCode", "Back To Back SWE", "Kevin Naughton Jr.",
  "Java Brains", "ProgrammingKnowledge", "CodingEntrepreneurs",
  "CS Dojo", "TechWorld with Nana", "ByteByteGo", "Amigoscode",

  // Web / Frontend / UI UX
  "DesignCourse", "Kevin Powell", "Flux Academy", "AJ&Smart",
  "Figma", "Frontend Mentor", "Hyperplexed", "Jesse Showalter",

  // AI / ML / Data Science
  "DeepLearningAI", "StatQuest with Josh Starmer", "Krish Naik",
  "Data School", "Sentdex", "Codebasics", "AssemblyAI",
  "Weights & Biases", "Yannic Kilcher", "Two Minute Papers",
  "OpenAI", "DeepMind", "Google Research", "IBM Technology",

  // Mathematics / Science
  "3Blue1Brown", "Numberphile", "Computerphile", "Veritasium",
  "Khan Academy", "MIT OpenCourseWare", "Harvard CS50",
  "CrashCourse", "Neso Academy", "Physics Wallah",
  "Mathologer", "Blackpenredpen", "Professor Leonard",
  "Organic Chemistry Tutor", "PBS Space Time", "MinutePhysics",
  "ScienceClic English", "SmarterEveryDay",

  // Engineering / Electronics / Robotics
  "GreatScott!", "EEVblog", "Afrotechmods", "Jeremy Fielding",
  "Learn Engineering", "Real Engineering", "Practical Engineering",
  "Stuff Made Here", "Mark Rober", "James Bruton",
  "ElectroBOOM", "DroneBot Workshop", "Andreas Spiess",
  "MIT OpenCourseWare", "NPTEL",

  // Cybersecurity / Networking / DevOps
  "NetworkChuck", "John Hammond", "David Bombal",
  "LiveOverflow", "HackerSploit", "TCM Security",
  "The Cyber Mentor", "Computerphile", "Professor Messer",
  "TechWorld with Nana", "KodeKloud",

  // Cloud / System Design
  "Amazon Web Services", "Google Developers",
  "Microsoft Developer", "ByteByteGo", "Gaurav Sen",
  "Hussein Nasser", "TechWorld with Nana",

  // Startup / Entrepreneurship / Business
  "Y Combinator", "Stanford eCorner", "Alex Hormozi",
  "GaryVee", "Startup Grind", "The Futur",
  "Ali Abdaal", "Simon Squibb", "Noah Kagan",

  // Productivity / Study Skills / Career
  "Ali Abdaal", "Thomas Frank", "Cajun Koi Academy",
  "Med School Insiders", "Justin Sung", "Mariana Vieira",
  "Andrew Huberman", "Better Ideas",

  // Communication / Speaking / Writing
  "TED", "TEDx Talks", "Charisma on Command",
  "Speak English With Mr Duncan", "English with Lucy",
  "BBC Learning English", "CrashCourse",

  // Finance / Investing / Economics
  "The Plain Bagel", "Ben Felix", "Economics Explained",
  "Patrick Boyle", "MIT OpenCourseWare",
  "Khan Academy", "Two Cents", "Money & Macro",

  // Design / Creative Skills
  "The Futur", "Satori Graphics", "Piximperfect",
  "PiXimperfect", "Adobe Creative Cloud", "Canva",
  "Blender Guru", "CG Geek",

  // Universities / Research
  "MIT OpenCourseWare", "Stanford Online", "Harvard University",
  "YaleCourses", "Oxford Online", "UC Berkeley",
  "Caltech", "Princeton University", "Carnegie Mellon University",
  "University of Cambridge", "ETH Zurich", "CERN",
  "NASA", "Nature", "Science Magazine", "arXiv",


  // Video Editing / Filmmaking
  "Premiere Gal", "Finzar", "Justin Odisho", "Peter McKinnon",
  "Daniel Schiffer", "Cinecom.net", "Think Media", "Hillier Smith",
  "Casey Faris", "MrAlexTech", "Film Riot", "YCImaging",
  "Learn Online Video", "Full Time Filmmaker",

  // Motion Graphics / VFX / 3D
  "Ben Marriott", "SonduckFilm", "Video Copilot",
  "Blender Guru", "CG Geek", "Ducky 3D",
  "CrossMind Studio", "Surfaced Studio",

  // Quant / Trading / Finance / Math for Finance
  "QuantInsti", "Hudson and Thames", "Ernest Chan",
  "Patrick Boyle", "Aswath Damodaran", "Ben Felix",
  "The Plain Bagel", "Financial Wisdom", "QuantPy",
  "Machine Learning Street Talk", "MIT OpenCourseWare",
  "Yale Open Courses", "Khan Academy",

  // Statistics / Data / Quant Math
  "StatQuest with Josh Starmer", "Brandon Foltz",
  "zedstatistics", "Josh Starmer", "MarinStatsLectures-R Programming & Statistics",
  "Quantitative Finance", "Mathologer", "3Blue1Brown",

  // Cybersecurity Niche
  "IppSec", "STÖK", "John Hammond", "LiveOverflow",
  "Hackersploit", "NetworkChuck", "Black Hills Information Security",

  // Electronics / Embedded / IoT / RC / Hardware
  "GreatScott!", "EEVblog", "Andreas Spiess",
  "DroneBot Workshop", "Afrotechmods", "Phil's Lab",
  "Robert Feranec", "Ben Eater", "Jeremy Fielding",
  "Electronoobs", "How To Mechatronics", "Paul McWhorter",

  // Robotics / Mechatronics / CAD
  "James Bruton", "Stuff Made Here", "RealPars",
  "Learn Engineering", "Mark Rober", "Jeremy Fielding",
  "Product Design Online", "Lars Christensen",

  // UI / UX / Product Design
  "DesignCourse", "Flux Academy", "AJ&Smart",
  "Mizko", "Jesse Showalter", "Figma",
  "Vaexperience", "Femke.design",

  // Startup / Indie Hacker / SaaS
  "Y Combinator", "Alex Hormozi", "Simon Squibb",
  "Indie Hackers", "MicroConf", "The Futur",
  "Ali Abdaal", "Noah Kagan", "Greg Isenberg",

  // Productivity / High Performance
  "Ali Abdaal", "Thomas Frank", "Justin Sung",
  "Cajun Koi Academy", "Andrew Huberman",
  "Better Ideas", "HealthyGamerGG",

  // Communication / Negotiation / Leadership
  "Charisma on Command", "TED", "TEDx Talks",
  "Harvard Business Review", "Stanford Graduate School of Business",
  "Chris Voss", "Simon Sinek",

  // Writing / Copywriting / Marketing
  "Alex Cattoni", "Copy That!", "Neville Medhora",
  "HubSpot", "Marketing Harry", "Ahrefs",
  "Income School", "Neil Patel",

  // Music Production / Audio Engineering
  "Andrew Huang", "In The Mix", "Produce Like A Pro",
  "Pensado's Place", "Rick Beato",

  // Photography / Visual Storytelling
  "Peter McKinnon", "Mango Street", "Sean Tucker",
  "Jamie Windsor", "The Art of Photography",

  // Architecture / CAD / Mechanical Design
  "Product Design Online", "Lars Christensen",
  "NYC CNC", "Practical Engineering",

  // Language Learning
  "English with Lucy", "BBC Learning English",
  "Speak English With Mr Duncan", "Easy Languages",
  "Japanese Ammo with Misa", "SpanishDict",

  // Philosophy / Critical Thinking / Psychology
  "School of Life", "CrashCourse Philosophy",
  "Wireless Philosophy", "Big Think",
  "Andrew Huberman", "HealthyGamerGG",

  // Space / Aerospace / Deep Tech
  "Everyday Astronaut", "Scott Manley",
  "PBS Space Time", "NASA", "Real Engineering",

  // Game Development
  "Brackeys", "Code Monkey", "Sebastian Lague",
  "Game Maker's Toolkit", "GDC", "Blackthornprod",

  // Competitive Programming / DSA
  "NeetCode", "Abdul Bari", "take U forward",
  "Errichto", "William Lin", "Tushar Roy - Coding Made Simple",

  // Resume / Career / Interview
  "ByteByteGo", "Ex-Google TechLead",
  "Self Made Millennial", "CareerVidz",
  "Jeff Su", "Ken Jee",

  // Higher Level Math / Pure Math / Olympiad / University Math
  "3Blue1Brown", "Mathologer", "blackpenredpen",
  "Professor Leonard", "The Bright Side of Mathematics",
  "Michael Penn", "Aleph 0", "Dr Peyam",
  "N J Wildberger", "Flammable Maths",
  "Faculty of Khan", "MIT OpenCourseWare",
  "Stanford Online", "Harvard Mathematics Department",
  "Oxford Mathematics", "Harvard University",
  "MathTheBeautiful", "Bprp", "Eddie Woo",
  "MIT Mathematics", "OxfordMathematics",
  "Dr. Trefor Bazett", "Tibees",
  "Richard E. Borcherds", "VisualMath",
  "Mathematics Stack Exchange", "Center of Math",
  "Numberphile", "PBS Infinite Series",
  "Brandon Foltz", "zedstatistics",
  "StatQuest with Josh Starmer"
];

// Clean flat list of high-quality educational channels with duplicates automatically removed
export const ALLOWED_CHANNELS = Array.from(new Set(RAW_ALLOWED_CHANNELS));

// Optimized Set lookup for fast O(1) channel safety validation
export const ALLOWED_CHANNELS_SET = new Set(
  ALLOWED_CHANNELS.map(ch => ch.trim().toLowerCase())
);