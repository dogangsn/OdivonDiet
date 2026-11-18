export const environment = {
  production: true,
  apiBaseUrl: 'https://mainapi.odivon.com/api/v1',
  // Public Firebase web config of the shared MainAPI project (not a secret; it identifies the project).
  firebase: {
    apiKey: 'AIzaSyC4v_noRltBQG1Pxu2FF5J0GPYt22aRkHk',
    authDomain: 'odivon-main-api-a2095.firebaseapp.com',
    projectId: 'odivon-main-api-a2095',
    appId: '',
  },
  appCheckSiteKey: '',
} as const;

