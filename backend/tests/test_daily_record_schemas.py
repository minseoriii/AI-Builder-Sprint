import pytest

from app.schemas.daily_record import (
    CategoryRankingItem,
    DailyRecordClassificationAIResponse,
    DailyRecordExtractionAIResponse,
    DimensionExtraction,
    DimensionStatus,
    NormalizedCandidate,
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


def test_extraction_filters_invalid_normalized_tags():
    result = DailyRecordExtractionAIResponse(
        dimensions={
            "PERSON": DimensionExtraction(
                status=DimensionStatus.MISSING,
                raw_values=[],
                normalized_candidates=[
                    NormalizedCandidate(tag="없는태그", score=0.5),
                ],
                evidence=[],
            ),
            "PLACE": DimensionExtraction(
                status=DimensionStatus.PRESENT,
                raw_values=["학교"],
                normalized_candidates=[NormalizedCandidate(tag="학교", score=1.0)],
                evidence=["학교에서"],
            ),
            "ACTIVITY": DimensionExtraction(
                status=DimensionStatus.PRESENT,
                raw_values=["개발"],
                normalized_candidates=[NormalizedCandidate(tag="개발", score=1.0)],
                evidence=["개발"],
            ),
            "TIME": DimensionExtraction(
                status=DimensionStatus.MISSING,
                raw_values=[],
                normalized_candidates=[],
                evidence=[],
            ),
            "EMOTION": DimensionExtraction(
                status=DimensionStatus.PRESENT,
                raw_values=["힘들다"],
                normalized_candidates=[NormalizedCandidate(tag="힘들어", score=0.9)],
                evidence=["힘들다"],
            ),
        },
        missing_question_types=["PERSON"],
    )
    assert result.dimensions["PERSON"].normalized_candidates == []


def test_extraction_requires_all_dimensions():
    with pytest.raises(ValueError):
        DailyRecordExtractionAIResponse(
            dimensions={
                "PERSON": DimensionExtraction(
                    status=DimensionStatus.PRESENT,
                    raw_values=["민서"],
                    evidence=["민서랑"],
                ),
            },
            missing_question_types=[],
        )
