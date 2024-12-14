# WSP_2024_team1
<h3>작업 디렉토리 설명</h3>


한국공학대 최우진 교수님의 웹서비스프로그래밍 팀프로젝트 repository
월목 1팀
컴퓨터공학과 2020150040 정승민
컴퓨터공학과 2020150037 장민재
컴퓨터공학과 2020150036 이지희
컴퓨터공학과 2020150035 이주영

"""2024.11.14 : 16:21"""

> 깃 툴로 폴더 받아서 받은 폴더로 이클립스 열면 될듯
>
> """2024.11.19 // 15:49"""
> 예상 작업 분할

#웹페이지 UI – 이주영, 이지희

    홈 화면
    제작 화면
        정보를 받는 화면
            정보 부족 시 주는 선택지
    재생화면(tts를 통한 동화책 읽기)
    창고(제작된 동화 재상 가능한 곳)
    로딩 화면 필요(AI 제작 시 걸리는 시간에 대한 액션)

#웹페이지 – AI 프롬프트 // 이미지 생성 프롬프트 - 장민재

    정보를 받는 형식
        이분법형(월드컵형, 비기너형)
        스토리를 모두 받아서 생성(숙련자형)
            정보를 모두 받으면 정리해서 프롬프트 등으로 하여 이미지 및 스토리 생성
    생성한 이미지 및 텍스트를 웹페이지로 보내기

#동화 및 사용자 id 저장 DB – 사용자 로그인 및 DB에 데이터 저장 - 정승민

    사용자 구분을 위해 로그인이 필요 – 뭘 쓰지? Firebase?
    동화책에 저장 방법에 대한 정의 필요
    사용자 구분을 위한 personal key 값 정의 필요

"""2024.12.05"""
* jps 뷰 페이즈 : 4개 { 어드민 | 비기너 용 선택 페이지, 숙련자 용 선택 페이지, 만든 것 목록 }
* **사용자에게 동화 만들 정보를 받는다 -> OpenAI 에 넣는다 -> 결과물을 받는다 ->** 동화 페이지 보여준다.
*     결과물을 받는다 까지가 12.15일까지
*     아래 처럼 mvc 패턴으로 구조화 예정
project-root/
│
├── app/
│   ├── models/
│   │   ├── storyModel.js        # 동화 데이터 모델
│   │   ├── userModel.js         # 사용자 데이터 모델
│   │   ├── ttsModel.js          # TTS 결과 저장 로직
│   │   └── adminModel.js        # 어드민 관련 데이터 모델
│   │
│   ├── views/
│   │   ├── layouts/
│   │   │   ├── main.html        # 공통 레이아웃
│   │   │   └── admin.html       # 어드민 전용 레이아웃
│   │   ├── pages/
│   │   │   ├── storyList.html   # 사용자 동화 리스트 페이지
│   │   │   ├── storyView.html   # 사용자 동화 상세 페이지
│   │   │   ├── ttsPlayback.html # 사용자 TTS 재생 페이지
│   │   │   └── admin/
│   │   │       ├── dashboard.html   # 어드민 대시보드
│   │   │       ├── manageStories.html # 동화 관리 페이지
│   │   │       └── manageUsers.html   # 사용자 관리 페이지
│   │   └── components/
│   │       ├── storyCard.html   # 동화 카드 컴포넌트
│   │       ├── ttsButton.html   # TTS 버튼 컴포넌트
│   │       └── adminNav.html    # 어드민 전용 네비게이션
│   │
│   ├── controllers/
│   │   ├── storyController.js   # 동화 생성/조회 처리
│   │   ├── ttsController.js     # TTS 요청 처리
│   │   ├── userController.js    # 사용자 입력 처리
│   │   └── adminController.js   # 어드민 요청 처리 (대시보드, 사용자/동화 관리)
│
├── python-scripts/
│   ├── generate_image.py        # Google Imagen3로 이미지 생성
│   ├── generate_text.py         # Gemini API로 텍스트 생성
│   └── generate_tts.py          # gTTs로 TTS 생성
│
├── public/
│   ├── css/
│   │   ├── styles.css           # 사용자 메인 스타일
│   │   ├── responsive.css       # 반응형 스타일
│   │   └── admin.css            # 어드민 전용 스타일
│   ├── js/
│   │   ├── main.js              # 사용자 클라이언트 로직
│   │   ├── ttsControl.js        # TTS 재생 로직
│   │   └── admin.js             # 어드민 전용 클라이언트 로직
│   ├── images/
│   │   ├── story1.jpg           # 동화 이미지
│   │   └── story2.jpg           # 동화 이미지
│   └── audio/
│       ├── story1.mp3           # TTS 생성된 오디오
│       └── story2.mp3           # TTS 생성된 오디오
│
├── config/
│   ├── firebaseConfig.js        # Firebase 연결 설정
│   ├── geminiConfig.json        # Gemini API 설정
│   └── appConfig.js             # 앱 전역 설정
│
├── tests/
│   ├── unit/
│   │   ├── modelTests.js        # Model 테스트
│   │   ├── controllerTests.js   # Controller 테스트
│   │   ├── pythonIntegrationTests.py # Python 통합 테스트
│   │   └── adminTests.js        # 어드민 기능 테스트
│   └── integration/
│       ├── userFlowTests.js     # 사용자 흐름 테스트
│       ├── adminFlowTests.js    # 어드민 흐름 테스트
│
├── server/
│   ├── index.js                 # 서버 진입점 (Express.js)
│   ├── routes/
│   │   ├── storyRoutes.js       # 사용자 동화 라우팅
│   │   ├── ttsRoutes.js         # TTS 라우팅
│   │   └── adminRoutes.js       # 어드민 전용 라우팅
│   └── utils/
│       ├── callPython.js        # Python 스크립트 호출 유틸리티
│       └── responseHandler.js   # API 응답 처리 유틸리티
│
└── README.md                    # 프로젝트 설명
