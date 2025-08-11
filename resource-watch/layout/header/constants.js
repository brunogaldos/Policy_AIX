export const APP_HEADER_ITEMS = [
  {
    id: 'data',
    label: 'Data',
    href: '/data/explore',
    // used to determine if the menu should be highlighted based on the current page
    root: '/data',
    children: [
      {
        label: 'Explore Datasets',
        href: '/data/explore',
      },
      {
        label: 'Near Real-Time Data',
        href: '/data/explore?section=Near%20Real-Time',
      },
      {
        label: 'App Gallery',
        href: '/get-involved/apps',
      },
    ],
  },
  {
    id: 'search',
    label: 'Search',
  },
  {
    user: false,
    id: 'user',
    label: 'Log in',
  },
  {
    user: true,
    id: 'user',
    href: '/myrw',
    label: 'My Resource Watch',
    children: [
      {
        label: 'Profile',
        href: '/myrw/profile',
      },
      {
        label: 'Admin',
        href: '/admin',
        admin: true,
      },
      {
        label: 'Logout',
        id: 'logout',
      },
    ],
  },
];

export default { APP_HEADER_ITEMS };
