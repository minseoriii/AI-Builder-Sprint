import pytest

from app.schemas.daily_record import (
    CategoryRankingItem,
    DailyRecordClassificationAIResponse,
    DailyRecordExtractionAIResponse,
    DimensionExtraction,
)


def test_classification_duplicate_ranking_rejected():
    with pytest.raises(ValueError):
        DailyRecordClassificationAIResponse(
            primary_category="관계·사랑",
            category_ranking=[
                CategoryRankingItem(
                    category="관계·사랑",
                    score=0.9,
                    evidence=["민서랑"],
                    reason="test",
                ),
                CategoryRankingItem(
                    category="관계·사랑",
                    score=0.8,
                    evidence=["오랜만에"],
                    reason="test2",
                ),
            ],
        )


def test_classification_score_order_rejected():
    with pytest.raises(ValueError):
        DailyRecordClassificationAIResponse(
            primary_category="관계·사랑",
            category_ranking=[
                CategoryRankingItem(
                    category="관계·사랑",
                    score=0.5,
                    evidence=["민서랑"],
                    reason="test",
                ),
                CategoryRankingItem(
                    category="즐거움·여가",
                    score=0.9,
                    evidence=["치킨"],
                    reason="test2",
                ),
            ],
        )


def test_classification_primary_mismatch_rejected():
    with pytest.raises(ValueError):
        DailyRecordClassificationAIResponse(
            primary_category="관계·사랑",
            category_ranking=[
                CategoryRankingItem(
                    category="즐거움·여가",
                    score=0.9,
                    evidence=["치킨"],
                    reason="test",
                ),
            ],
        )


def test_extraction_requires_all_dimensions():
    with pytest.raises(ValueError):
        DailyRecordExtractionAIResponse(
            dimensions={
                "PERSON": DimensionExtraction(values=["민서"], evidence=["민서랑"]),
            },
            missing_dimensions=[],
        )
