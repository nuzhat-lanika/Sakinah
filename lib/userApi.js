import { db } from './firebase.js'
import {
  doc, getDoc, setDoc, addDoc, getDocs,
  collection, query, orderBy, limit, deleteDoc, arrayUnion,
} from 'firebase/firestore'

// ─── Bookmarks ────────────────────────────────────────────────────────────────

export async function saveBookmark(userId, bookmark) {
  const colRef = collection(db, 'users', userId, 'bookmarks')
  await addDoc(colRef, { ...bookmark, createdAt: Date.now() })
}

export async function getBookmarks(userId) {
  const colRef = collection(db, 'users', userId, 'bookmarks')
  const q = query(colRef, orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deleteBookmark(userId, bookmarkId) {
  const ref = doc(db, 'users', userId, 'bookmarks', bookmarkId)
  await deleteDoc(ref)
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export async function updateStreak(userId) {
  const ref = doc(db, 'users', userId, 'streak', 'current')
  const snap = await getDoc(ref)
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  let data = { currentStreak: 1, longestStreak: 1, lastActiveDate: today }
  if (snap.exists()) {
    const prev = snap.data()
    if (prev.lastActiveDate === today) return prev
    data.currentStreak = prev.lastActiveDate === yesterdayStr ? (prev.currentStreak || 1) + 1 : 1
    data.longestStreak = Math.max(prev.longestStreak || 1, data.currentStreak)
    data.lastActiveDate = today
  }
  await setDoc(ref, data)
  return data
}

export async function getStreak(userId) {
  const ref = doc(db, 'users', userId, 'streak', 'current')
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

// ─── Reflections ──────────────────────────────────────────────────────────────

export async function saveReflection(userId, reflection) {
  const colRef = collection(db, 'users', userId, 'reflections')
  await addDoc(colRef, { ...reflection, createdAt: Date.now(), date: new Date().toISOString().split('T')[0] })
}

export async function getReflections(userId, count = 20) {
  const colRef = collection(db, 'users', userId, 'reflections')
  const q = query(colRef, orderBy('createdAt', 'desc'), limit(count))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

// ─── Memory / Themes ──────────────────────────────────────────────────────────

export async function getMemory(userId) {
  const ref = doc(db, 'users', userId, 'memory', 'current')
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function updateMemory(userId, theme, emotion) {
  const ref = doc(db, 'users', userId, 'memory', 'current')
  const snap = await getDoc(ref)
  const today = new Date().toISOString().split('T')[0]
  const prev = snap.exists() ? snap.data() : {}
  const themes = prev.themes || {}
  if (theme) themes[theme] = (themes[theme] || 0) + 1
  const emotionLog = prev.emotion_log || []
  if (emotion) emotionLog.push({ date: today, emotion })
  await setDoc(ref, { themes, emotion_log: emotionLog.slice(-30) }, { merge: true })
}

// ─── XP / Gamification ────────────────────────────────────────────────────────

export async function getUserXP(userId) {
  const ref = doc(db, 'users', userId, 'gamification', 'xp')
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function addUserXP(userId, amount) {
  const ref = doc(db, 'users', userId, 'gamification', 'xp')
  const snap = await getDoc(ref)
  const prev = snap.exists() ? snap.data() : { xp: 0, level: 1, achievements: [] }
  const newXP = (prev.xp || 0) + amount
  const newLevel = Math.floor(newXP / 100) + 1
  const updated = { xp: newXP, level: newLevel, achievements: prev.achievements || [] }
  await setDoc(ref, updated)
  return updated
}

export async function unlockAchievement(userId, achievementId) {
  const ref = doc(db, 'users', userId, 'gamification', 'xp')
  await setDoc(ref, { achievements: arrayUnion(achievementId) }, { merge: true })
}

// ─── Memorization Progress ────────────────────────────────────────────────────

/**
 * Save memorization progress for a chunk.
 * @param {string} userId
 * @param {{ moduleId: string, surah: number, chunkId: string, status: string, completedAt: number }} progress
 */
export async function saveMemorizeProgress(userId, progress) {
  const ref = doc(db, 'users', userId, 'memorize', progress.moduleId)
  await setDoc(ref, { ...progress, updatedAt: Date.now() }, { merge: true })
}

/**
 * Get all memorization progress for a user.
 * @param {string} userId
 * @returns {Promise<Record<string, object>>}
 */
export async function getMemorizeProgress(userId) {
  const colRef = collection(db, 'users', userId, 'memorize')
  const snap = await getDocs(colRef)
  const result = {}
  snap.docs.forEach((d) => { result[d.id] = d.data() })
  return result
}

/**
 * Get unlocked module index from Firestore.
 * @param {string} userId
 */
export async function getUnlockedModuleIndex(userId) {
  const ref = doc(db, 'users', userId, 'memorize', '_meta')
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data().unlockedIndex || 0 : 0
}

/**
 * Update the unlocked module index.
 * @param {string} userId
 * @param {number} index
 */
export async function setUnlockedModuleIndex(userId, index) {
  const ref = doc(db, 'users', userId, 'memorize', '_meta')
  await setDoc(ref, { unlockedIndex: index, updatedAt: Date.now() }, { merge: true })
}

// ─── Chat History ─────────────────────────────────────────────────────────────

export async function getChatHistory(userId) {
  const ref = doc(db, 'users', userId, 'chat', 'history')
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data().messages || [] : []
}

export async function saveChatHistory(userId, messages) {
  const ref = doc(db, 'users', userId, 'chat', 'history')
  await setDoc(ref, { messages: messages.slice(-40), updatedAt: Date.now() })
}
