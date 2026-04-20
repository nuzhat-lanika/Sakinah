const baseHadiths = [
  { text: "Actions are judged by intentions.", source: "Sahih Al-Bukhari" },
  { text: "The best among you are those who learn the Qur'an and teach it.", source: "Sahih Al-Bukhari" },
  { text: "Do not be angry.", source: "Sahih Al-Bukhari" },
  { text: "Make things easy and do not make them difficult.", source: "Sahih Al-Bukhari" },
  { text: "Allah does not look at your appearance or wealth, but at your hearts and deeds.", source: "Sahih Muslim" },
  { text: "The strongest among you is the one who controls his anger.", source: "Sahih Al-Bukhari" },
  { text: "Smiling in your brother's face is charity.", source: "Tirmidhi" },
  { text: "Whoever believes in Allah and the Last Day should speak good or remain silent.", source: "Sahih Al-Bukhari" },
  { text: "The best of people are those who are most beneficial to others.", source: "Daraqutni" },
  { text: "Charity does not decrease wealth.", source: "Sahih Muslim" },
  { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Sahih Al-Bukhari" },
  { text: "Purity is half of faith.", source: "Sahih Muslim" },
  { text: "The best deeds are those done consistently, even if small.", source: "Sahih Al-Bukhari" },
  { text: "A kind word is charity.", source: "Sahih Muslim" },
  { text: "He who does not show mercy to others will not be shown mercy.", source: "Sahih Al-Bukhari" },
  { text: "The believer is not the one who eats his fill while his neighbor goes hungry.", source: "Al-Bayhaqi" },
  { text: "Verily, Allah is gentle and loves gentleness.", source: "Sahih Muslim" },
  { text: "Patience is at the first strike of calamity.", source: "Sahih Al-Bukhari" },
  { text: "He who believes in Allah and the Last Day should honor his guest.", source: "Sahih Al-Bukhari / Muslim" },
  { text: "Cleanliness is part of faith.", source: "Sahih Muslim" },
  { text: "The most beloved deeds to Allah are those done consistently.", source: "Sahih Al-Bukhari" },
  { text: "A believer is not stung from the same hole twice.", source: "Sahih Al-Bukhari" },
  { text: "Feed the hungry, visit the sick, and free the captive.", source: "Sahih Al-Bukhari" },
  { text: "Spread peace among yourselves.", source: "Sahih Muslim" },
  { text: "The best of you are those best to their families.", source: "Tirmidhi" },
  { text: "Allah is beautiful and loves beauty.", source: "Sahih Muslim" },
  { text: "Whoever relieves a believer's hardship, Allah will relieve his hardship.", source: "Sahih Muslim" },
  { text: "Truthfulness leads to righteousness.", source: "Sahih Al-Bukhari / Muslim" },
  { text: "The strong is not the one who overcomes others, but the one who controls himself in anger.", source: "Sahih Al-Bukhari" },
  { text: "Remove harmful things from the path is charity.", source: "Sahih Muslim" },
  { text: "He who does not thank people, does not thank Allah.", source: "Tirmidhi" },
]

export const HADITH_365 = Array.from({ length: 365 }, (_, i) => ({
  id: i + 1,
  day: i + 1,
  text: baseHadiths[i % baseHadiths.length].text,
  source: baseHadiths[i % baseHadiths.length].source,
}))

export function getTodayHadith() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24)
  return HADITH_365[dayOfYear % 365]
}
