import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DailyBonusRecord } from "./daily-bonus";

const KEY_PREFIX = "@bourbon_app/daily_bonus/";

export async function readDailyBonus(today: string): Promise<DailyBonusRecord | null> {
  const raw = await AsyncStorage.getItem(KEY_PREFIX + today);
  if (!raw) return null;
  return JSON.parse(raw) as DailyBonusRecord;
}

export async function writeDailyBonus(today: string, record: DailyBonusRecord): Promise<void> {
  await AsyncStorage.setItem(KEY_PREFIX + today, JSON.stringify(record));
}

export async function clearDailyBonus(today: string): Promise<void> {
  await AsyncStorage.removeItem(KEY_PREFIX + today);
}
