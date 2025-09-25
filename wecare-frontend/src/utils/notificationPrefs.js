// Hidden notifications are now server-managed. This module is retained as a no-op to avoid breaking imports.
export const getHiddenStorageKey = () => "hidden_notifications_server_managed";
export const getHiddenIds = () => [];
export const hideNotificationId = () => {};
export const unhideNotificationId = () => {};
export const isHiddenId = () => false;


