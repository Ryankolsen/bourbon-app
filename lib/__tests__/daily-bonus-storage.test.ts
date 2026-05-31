import AsyncStorage from "@react-native-async-storage/async-storage";
import { readDailyBonus, writeDailyBonus, clearDailyBonus } from "../daily-bonus-storage";
import type { DailyBonusRecord } from "../daily-bonus";

const KEY = "@bourbon_app/daily_bonus/2026-05-30";

const sampleRecord: DailyBonusRecord = {
  awardedPoints: 5,
  streakDays: 5,
  milestoneHit: false,
  tomorrowPoints: 6,
  nextMilestone: { day: 7, daysRemaining: 2, bonusXp: 20 },
  acknowledged: false,
};

describe("daily-bonus-storage", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  // Test 1: write/read round-trip
  it("write stores JSON at date key; read parses it back", async () => {
    await writeDailyBonus("2026-05-30", sampleRecord);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(KEY, JSON.stringify(sampleRecord));
    const result = await readDailyBonus("2026-05-30");
    expect(result).toEqual(sampleRecord);
  });

  // Test 2: clear → removeItem → subsequent read returns null
  it("clear calls removeItem; subsequent read returns null", async () => {
    await writeDailyBonus("2026-05-30", sampleRecord);
    await clearDailyBonus("2026-05-30");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KEY);
    const result = await readDailyBonus("2026-05-30");
    expect(result).toBeNull();
  });

  // Test 3: read miss returns null when nothing stored
  it("read returns null when no record is stored for the date", async () => {
    const result = await readDailyBonus("2026-05-30");
    expect(result).toBeNull();
  });
});
