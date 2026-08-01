CONSTELLATION_CATEGORIES: tuple[str, ...] = (
    "가족",
    "관계·사랑",
    "건강",
    "성장·배움",
    "커리어·성취",
    "재정적 안정",
    "자율·독립",
    "창의성·표현",
    "기여·봉사",
    "영성·신념",
    "즐거움·여가",
    "모험·도전",
    "소속감·공동체",
    "진정성·자기다움",
    "리더십·영향력",
    "균형·조화",
)

NORTH_STAR_ANALYSIS_PROMPT_VERSION = "north_star_constellation_v1"

NORTH_STAR_TEXT_MIN_LENGTH = 1
NORTH_STAR_TEXT_MAX_LENGTH = 500

DAILY_RECORD_DIMENSIONS: tuple[str, ...] = (
    "PERSON",
    "PLACE",
    "ACTIVITY",
    "TIME",
    "EMOTION",
)

DIMENSION_LABELS: dict[str, str] = {
    "PERSON": "함께한 사람",
    "PLACE": "장소",
    "ACTIVITY": "활동",
    "TIME": "시간",
    "EMOTION": "감정",
}

QUESTION_PRESETS: dict[str, str] = {
    "PERSON": "오늘 누구와 함께했나요? 혼자였다면 ‘나 자신’이라고 적어주세요.",
    "PLACE": "오늘의 기억은 어디에서 있었나요?",
    "ACTIVITY": "그곳에서 무엇을 했나요?",
    "TIME": "언제 있었던 일이거나 어떤 시간적 맥락이 있었나요?",
    "EMOTION": "그때 어떤 감정이 들었나요?",
}

DAILY_RECORD_TEXT_MIN_LENGTH = 1
DAILY_RECORD_TEXT_MAX_LENGTH = 2000

TAG_MIN_LENGTH = 1
TAG_MAX_LENGTH = 50
TAGS_PER_DIMENSION_MAX = 5
TAGS_TOTAL_MAX = 20

DAILY_RECORD_EXTRACTION_PROMPT_VERSION = "daily_record_extraction_v1"
DAILY_RECORD_CLASSIFICATION_PROMPT_VERSION = "daily_record_classification_v1"

STAR_PREVIEW_MAX_LENGTH = 120

DEFAULT_TIMEZONE = "Asia/Seoul"

COMET_TITLE_MIN_LENGTH = 1
COMET_TITLE_MAX_LENGTH = 100
COMET_DESCRIPTION_MAX_LENGTH = 500
COMET_ACTIVITY_SUMMARY_MIN_LENGTH = 1
COMET_ACTIVITY_SUMMARY_MAX_LENGTH = 500
COMET_REASON_MAX_LENGTH = 300
COMET_ESTIMATED_MINUTES_MIN = 5
COMET_ESTIMATED_MINUTES_MAX = 60
COMET_DUPLICATE_TITLE_DAYS = 7

COMET_RECOMMENDATION_PROMPT_VERSION = "comet_recommendation_v1"
GALAXY_OVERVIEW_SUMMARY_PROMPT_VERSION = "galaxy_overview_summary_v1"
SEASONAL_GALAXY_REPORT_PROMPT_VERSION = "seasonal_galaxy_report_v1"

GALAXY_SUMMARY_LINE_MAX_LENGTH = 300
GALAXY_REPORT_FIELD_MAX_LENGTH = 500
GALAXY_REFLECTION_MIN_LENGTH = 1
GALAXY_REFLECTION_MAX_LENGTH = 500

SEASON_LABELS: dict[str, str] = {
    "SPRING": "봄",
    "SUMMER": "여름",
    "AUTUMN": "가을",
    "WINTER": "겨울",
}
