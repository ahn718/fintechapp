# fintechapp

## Deployment
- 기본 브랜치를 `main`으로 사용하세요.
- Vercel 등 CI/CD 설정에서 배포 대상 브랜치를 `main`으로 지정해야 합니다.
- `npm run build`가 로컬에서 성공하는지 확인한 뒤 푸시하세요.

## Firebase 설정 (권한 오류 대응)
- 제공된 Firebase 프로젝트 설정을 그대로 사용하도록 앱을 고정했습니다.
  ```
  apiKey: "AIzaSyC1IElcIPL5_mxevrCoG3iZr4gvrCIM5M8",
  authDomain: "our-asset-manager.firebaseapp.com",
  projectId: "our-asset-manager",
  storageBucket: "our-asset-manager.firebasestorage.app",
  messagingSenderId: "898133422254",
  appId: "1:898133422254:web:61e2a1f2db6ef7331cbd3f",
  measurementId: "G-3KS2VMET2W"
  ```
- 배포 시 Firestore에서 `permission-denied`가 발생하면, Firebase 콘솔에서 사용 중인 프로젝트의 규칙을 확인하세요.
- 최소 구성 예시 (익명 인증 사용 시):
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /families/{familyId}/{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```
