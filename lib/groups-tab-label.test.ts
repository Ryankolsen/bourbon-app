import { groupsTabLabel } from "./groups-tab-label";

describe("groupsTabLabel", () => {
  it("includes the unread count when above zero", () => {
    expect(groupsTabLabel(3)).toBe("Groups, 3 unread");
  });

  it("is just 'Groups' with no unread notifications", () => {
    expect(groupsTabLabel(0)).toBe("Groups");
  });
});
