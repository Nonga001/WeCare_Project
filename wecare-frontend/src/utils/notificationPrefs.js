export const getHiddenStorageKey = (user) => {
  const id = user?._id || user?.id || 'anon';
  const role = user?.role || 'unknown';
  return `hidden_notifications_${id}_${role}`;
};

export const getHiddenIds = (user) => {
  try {
    const raw = localStorage.getItem(getHiddenStorageKey(user));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const hideNotificationId = (user, notificationId) => {
  const ids = new Set(getHiddenIds(user));
  ids.add(String(notificationId));
  localStorage.setItem(getHiddenStorageKey(user), JSON.stringify([...ids]));
};

export const unhideNotificationId = (user, notificationId) => {
  const ids = new Set(getHiddenIds(user));
  ids.delete(String(notificationId));
  localStorage.setItem(getHiddenStorageKey(user), JSON.stringify([...ids]));
};

export const isHiddenId = (user, notificationId) => {
  const ids = getHiddenIds(user);
  return ids.includes(String(notificationId));
};


