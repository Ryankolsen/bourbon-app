export function groupsTabLabel(unreadCount: number): string {
  return unreadCount > 0 ? `Groups, ${unreadCount} unread` : "Groups";
}
