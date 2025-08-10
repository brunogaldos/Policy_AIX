import { createSelector } from 'reselect';
import { AdapterModifier } from '@widget-editor/widget-editor';
import RWAdapter from '@widget-editor/rw-adapter';

const getLocale = (state) => state.common.locale;
const getUserToken = (state) => state.user.token;

export const getRWAdapter = createSelector(
  [getLocale, getUserToken],
  (locale, userToken) => AdapterModifier(RWAdapter, {
    endpoint: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/proxy`,
    env: process.env.NEXT_PUBLIC_API_ENV,
    applications: process.env.NEXT_PUBLIC_APPLICATIONS.split(','),
    locale,
    ...userToken && {
      userToken: userToken.split(' ')[1],
    },
  }),
);

export default { getRWAdapter };
