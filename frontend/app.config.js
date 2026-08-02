const path = require('path');
const { load } = require('@expo/env');

load(path.resolve(__dirname));

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    ...require('./app.json').expo,
    extra: {
      EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
      EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};
