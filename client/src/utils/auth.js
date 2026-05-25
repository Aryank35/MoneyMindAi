export const getCurrentUser = () => {
  const user = localStorage.getItem(
    "user"
  );

  return user
    ? JSON.parse(user)
    : null;
};

export const getUserId = () => {
  const user =
    getCurrentUser();

  return user?._id;
};

export const getToken = () => {
  return localStorage.getItem(
    "token"
  );
};