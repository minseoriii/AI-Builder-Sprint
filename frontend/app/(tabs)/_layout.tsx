import { Redirect } from 'expo-router';

/** Legacy tabs group — main UI lives at app/index.tsx */
export default function TabLayout() {
  return <Redirect href="/" />;
}
