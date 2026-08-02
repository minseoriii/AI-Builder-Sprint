
import pytest
from pydantic import ValidationError

from app.core.constants import CONSTELLATION_CATEGORIES
from app.schemas.onboarding import NorthStarAnalysisAIResponse
from app.services.north_star_analysis import validate_evidence_in_original
from app.services.upstage import validate_ai_response


def _valid_candidates(**overrides):
    base = [
        {
            "category": "가족",
            "score": 0.94,
            "recommended": True,
            "evidence": ["가족과"],
            "reason": "r1",
        },
        {
            "category": "건강",
            "score": 0.89,
            "recommended": True,
            "evidence": ["건강을"],
            "reason": "r2",
        },
        {
            "category": "성장·배움",
            "score": 0.85,
            "recommended": False,
            "evidence": ["배우고"],
            "reason": "r3",
        },
        {
            "category": "관계·사랑",
            "score": 0.80,
            "recommended": False,
            "evidence": ["가족과"],
            "reason": "r4",
        },
        {
            "category": "균형·조화",
            "score": 0.75,
            "recommended": False,
            "evidence": ["지키면서"],
            "reason": "r5",
        },
        {
            "category": "즐거움·여가",
            "score": 0.70,
            "recommended": False,
            "evidence": ["원하는"],
            "reason": "r6",
        },
        {
            "category": "자율·독립",
            "score": 0.65,
            "recommended": False,
            "evidence": ["내가"],
            "reason": "r7",
        },
    ]
    if overrides:
        base[0].update(overrides)
    return base


ORIGINAL_TEXT = "가족과 건강을 지키면서 내가 원하는 일을 꾸준히 배우고 싶다."


def test_valid_analysis_json_parsing():
    payload = {"candidates": _valid_candidates()}
    result = validate_ai_response(
        __import__("json").dumps(payload, ensure_ascii=False),
        NorthStarAnalysisAIResponse,
    )
    assert len(result.candidates) == 7


def test_invalid_constellation_rejected():
    candidates = _valid_candidates()
    candidates[0]["category"] = "존재하지않음"
    with pytest.raises(ValidationError):
        NorthStarAnalysisAIResponse.model_validate({"candidates": candidates})


def test_wrong_candidate_count():
    with pytest.raises(ValidationError):
        NorthStarAnalysisAIResponse.model_validate({"candidates": _valid_candidates()[:3]})


def test_duplicate_constellation():
    candidates = _valid_candidates()
    candidates[1]["category"] = "가족"
    with pytest.raises(ValidationError):
        NorthStarAnalysisAIResponse.model_validate({"candidates": candidates})


def test_too_many_recommended():
    candidates = _valid_candidates()
    for item in candidates:
        item["recommended"] = True
    with pytest.raises(ValidationError):
        NorthStarAnalysisAIResponse.model_validate({"candidates": candidates})


def test_evidence_must_be_in_original():
    result = NorthStarAnalysisAIResponse.model_validate({"candidates": _valid_candidates()})
    with pytest.raises(ValueError):
        validate_evidence_in_original(result, "전혀 다른 문장")


def test_all_constellations_defined():
    assert len(CONSTELLATION_CATEGORIES) == 16
