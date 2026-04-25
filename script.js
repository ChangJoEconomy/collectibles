// SR등급 대성공 확률 데이터
const SR_SUCCESS_RATES = {
    0: { basic: 3.6, medium: 11.0, high: 25.0 },
    1: { basic: 5.9, medium: 19.8, high: 40.0 },
    2: { basic: 7.8, medium: 28.7, high: 55.0 },
    3: { basic: 11.3, medium: 41.3, high: 75.0 },
    4: { basic: 15.0, medium: 55.0, high: 100.0 },
    5: { basic: 2.2, medium: 8.0, high: 20.0 },
    6: { basic: 3.3, medium: 12.0, high: 30.0 },
    7: { basic: 4.9, medium: 19.0, high: 45.0 },
    8: { basic: 7.6, medium: 28.0, high: 70.0 },
    9: { basic: 12.5, medium: 50.0, high: 100.0 },
    10: { basic: 1.2, medium: 5.4, high: 15.0 },
    11: { basic: 2.2, medium: 9.9, high: 27.5 },
    12: { basic: 3.1, medium: 14.4, high: 40.0 },
    13: { basic: 4.7, medium: 21.6, high: 60.0 },
    14: { basic: 10.0, medium: 45.0, high: 100.0 }
};

// 현재 보유 비율 가져오기
function getKitSupply() {
    const getVal = (id, def) => {
        const val = document.getElementById(id)?.value;
        const num = parseInt(val);
        return isNaN(num) ? def : num;  // 0도 유효하게 처리
    };
    return {
        basic: getVal('supplyBasic', 80),
        medium: getVal('supplyMedium', 15),
        high: getVal('supplyHigh', 5)
    };
}

function createKitInfoFromSupply(supply) {
    return {
        basic: { exp: 200, supply: supply.basic, name: '초급' },
        medium: { exp: 500, supply: supply.medium, name: '중급' },
        high: { exp: 1000, supply: supply.high, name: '상급' }
    };
}

// 보유 비율 입력 검증 (0 이상 정수, 최소 하나는 1 이상)
function validateKitSupply() {
    const inputs = [
        { id: 'supplyBasic', name: '초급 키트' },
        { id: 'supplyMedium', name: '중급 키트' },
        { id: 'supplyHigh', name: '상급 키트' }
    ];

    const values = [];

    for (const input of inputs) {
        const el = document.getElementById(input.id);
        const value = el?.value;
        const num = Number(value);

        // 비어있거나 숫자가 아닌 경우
        if (value === '' || isNaN(num)) {
            alert(`${input.name} 보유 비율을 입력해주세요.`);
            el?.focus();
            return false;
        }

        // 음수인 경우
        if (num < 0) {
            alert(`${input.name} 보유 비율은 0 이상의 정수를 입력해주세요.`);
            el?.focus();
            return false;
        }

        // 소수점인 경우
        if (!Number.isInteger(num)) {
            alert(`${input.name} 보유 비율은 정수만 입력 가능합니다. (소수점 불가)`);
            el?.focus();
            return false;
        }

        values.push(num);
    }

    // 모두 0인 경우
    if (values.every(v => v === 0)) {
        alert('보유 비율 중 최소 하나는 1 이상이어야 합니다.');
        return false;
    }

    return true;
}

// 허용 오차 (고정 상수)
const TOLERANCE_PERCENT = 2;

function getTolerancePercent() {
    return TOLERANCE_PERCENT;
}

// 비율 오차 계산: 실제 사용 비율이 목표 비율에서 얼마나 벗어났는지
function calculateRatioError(basicUsed, mediumUsed, highUsed, targetRatio) {
    const total = basicUsed + mediumUsed + highUsed;
    if (total === 0) return 0;

    // 실제 비율 계산
    const actualRatio = {
        basic: basicUsed / total,
        medium: mediumUsed / total,
        high: highUsed / total
    };

    // 목표 비율 정규화
    const targetTotal = targetRatio.basic + targetRatio.medium + targetRatio.high;
    const normalizedTarget = {
        basic: targetRatio.basic / targetTotal,
        medium: targetRatio.medium / targetTotal,
        high: targetRatio.high / targetTotal
    };

    // 각 키트별 오차의 최대값 (퍼센트포인트)
    const errors = [
        Math.abs(actualRatio.basic - normalizedTarget.basic) * 100,
        Math.abs(actualRatio.medium - normalizedTarget.medium) * 100,
        Math.abs(actualRatio.high - normalizedTarget.high) * 100
    ];

    return Math.max(...errors);
}

// KIT_INFO를 동적으로 생성
function getKitInfo() {
    return createKitInfoFromSupply(getKitSupply());
}

const MAX_LEVEL = 15;
const LEVEL_SECTIONS = [
    { start: 0, end: 5, targetLevel: 5 },
    { start: 5, end: 10, targetLevel: 10 },
    { start: 10, end: 15, targetLevel: 15 }
];

const SOLVER_MODES = {
    AVERAGE: 'average',
    COVERAGE: 'coverage'
};

const DEFAULT_STAGE_PRESET = '5-15';
const STAGE_PRESETS = {
    '5-15': {
        startLevel: 5,
        targetLevel: 15,
        description: '5단계에서 15단계까지 전체 경로를 계산합니다'
    },
    '5-10': {
        startLevel: 5,
        targetLevel: 10,
        description: '5단계에서 10단계까지만 계산합니다'
    },
    '10-15': {
        startLevel: 10,
        targetLevel: 15,
        description: '10단계에서 15단계까지만 계산합니다'
    },
    custom: {
        description: '시작 단계와 도착 단계를 직접 선택합니다.'
    }
};

const SOLVER_MODE_DETAILS = {
    [SOLVER_MODES.AVERAGE]: {
        description: '입력한 키트 비율과 유사하면서 사용량을 최소화 하는 경로를 탐색합니다.'
    },
    [SOLVER_MODES.COVERAGE]: {
        description: '입력한 키트 재고 내에서 도달 가능한 상위 구간을 계산합니다.'
    }
};

function getSelectedSolveMode() {
    const selectedMode = document.getElementById('solveMode')?.value;
    return SOLVER_MODE_DETAILS[selectedMode] ? selectedMode : SOLVER_MODES.AVERAGE;
}

function updateSolveModeUI(mode) {
    const nextMode = SOLVER_MODE_DETAILS[mode] ? mode : SOLVER_MODES.AVERAGE;
    const solveModeInput = document.getElementById('solveMode');
    const modeHelp = document.getElementById('modeHelp');
    const modeButtons = document.querySelectorAll('.mode-option');

    if (solveModeInput) {
        solveModeInput.value = nextMode;
    }

    modeButtons.forEach(button => {
        const isActive = button.dataset.mode === nextMode;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (modeHelp) {
        modeHelp.textContent = SOLVER_MODE_DETAILS[nextMode].description;
    }
}

function initSolveModeSelector() {
    const modeButtons = document.querySelectorAll('.mode-option');

    modeButtons.forEach(button => {
        button.addEventListener('click', () => {
            updateSolveModeUI(button.dataset.mode);
        });
    });

    updateSolveModeUI(getSelectedSolveMode());
}

function normalizeTargetLevel(targetLevel) {
    const parsed = Number(targetLevel);
    if (!Number.isInteger(parsed)) {
        return MAX_LEVEL;
    }
    return Math.min(MAX_LEVEL, Math.max(1, parsed));
}

function formatLevelRange(startLevel, targetLevel) {
    return `${startLevel} → ${targetLevel}`;
}

function getSelectedStagePreset() {
    const stagePreset = document.getElementById('stagePreset')?.value;
    return STAGE_PRESETS[stagePreset] ? stagePreset : DEFAULT_STAGE_PRESET;
}

function populateLevelSelectOptions(selectId, minLevel, maxLevel, selectedValue) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '';

    for (let level = minLevel; level <= maxLevel; level++) {
        const option = document.createElement('option');
        option.value = String(level);
        option.textContent = String(level);
        if (level === selectedValue) {
            option.selected = true;
        }
        select.appendChild(option);
    }
}

function syncCustomStageTargetOptions(preferredTargetLevel) {
    const fromLevelSelect = document.getElementById('fromLevel');
    const toLevelSelect = document.getElementById('toLevel');
    if (!fromLevelSelect || !toLevelSelect) return;

    const startLevel = parseInt(fromLevelSelect.value, 10);
    const preferredTarget = Number.isInteger(preferredTargetLevel) ? preferredTargetLevel : parseInt(toLevelSelect.value, 10);
    let nextTargetLevel = preferredTarget;

    Array.from(toLevelSelect.options).forEach(option => {
        const targetLevel = parseInt(option.value, 10);
        option.disabled = targetLevel <= startLevel;
    });

    if (!(nextTargetLevel > startLevel)) {
        const fallbackOption = Array.from(toLevelSelect.options).find(option => !option.disabled);
        nextTargetLevel = fallbackOption ? parseInt(fallbackOption.value, 10) : MAX_LEVEL;
    }

    toLevelSelect.value = String(nextTargetLevel);
}

function getSelectedStageRange() {
    const presetKey = getSelectedStagePreset();

    if (presetKey !== 'custom') {
        const preset = STAGE_PRESETS[presetKey];
        return {
            startLevel: preset.startLevel,
            targetLevel: preset.targetLevel,
            presetKey
        };
    }

    const startLevel = parseInt(document.getElementById('fromLevel')?.value, 10);
    const targetLevel = parseInt(document.getElementById('toLevel')?.value, 10);

    return {
        startLevel,
        targetLevel,
        presetKey
    };
}

function validateSelectedStageRange() {
    const { startLevel, targetLevel } = getSelectedStageRange();

    if (!Number.isInteger(startLevel) || !Number.isInteger(targetLevel)) {
        alert('강화 구간을 올바르게 선택해주세요.');
        return false;
    }

    if (startLevel < 0 || startLevel >= MAX_LEVEL) {
        alert(`시작 단계는 0 이상 ${MAX_LEVEL - 1} 이하만 선택할 수 있습니다.`);
        document.getElementById('fromLevel')?.focus();
        return false;
    }

    if (targetLevel <= startLevel || targetLevel > MAX_LEVEL) {
        alert(`도착 단계는 시작 단계보다 크고 ${MAX_LEVEL} 이하여야 합니다.`);
        document.getElementById('toLevel')?.focus();
        return false;
    }

    return true;
}

function updateStagePresetUI(presetKey) {
    const nextPreset = STAGE_PRESETS[presetKey] ? presetKey : DEFAULT_STAGE_PRESET;
    const stagePresetInput = document.getElementById('stagePreset');
    const stageHelp = document.getElementById('stageHelp');
    const customStageControls = document.getElementById('customStageControls');
    const stageButtons = document.querySelectorAll('.stage-option');
    const fromLevelSelect = document.getElementById('fromLevel');
    const toLevelSelect = document.getElementById('toLevel');

    if (stagePresetInput) {
        stagePresetInput.value = nextPreset;
    }

    stageButtons.forEach(button => {
        const isActive = button.dataset.stagePreset === nextPreset;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    if (stageHelp) {
        stageHelp.textContent = STAGE_PRESETS[nextPreset].description;
    }

    if (nextPreset !== 'custom') {
        const preset = STAGE_PRESETS[nextPreset];
        if (fromLevelSelect) {
            fromLevelSelect.value = String(preset.startLevel);
        }
        syncCustomStageTargetOptions(preset.targetLevel);
    } else {
        syncCustomStageTargetOptions(parseInt(toLevelSelect?.value, 10));
    }

    if (customStageControls) {
        customStageControls.hidden = nextPreset !== 'custom';
    }
}

function initStageSelector() {
    populateLevelSelectOptions('fromLevel', 0, MAX_LEVEL - 1, 5);
    populateLevelSelectOptions('toLevel', 1, MAX_LEVEL, MAX_LEVEL);

    const stageButtons = document.querySelectorAll('.stage-option');
    const fromLevelSelect = document.getElementById('fromLevel');
    const toLevelSelect = document.getElementById('toLevel');

    stageButtons.forEach(button => {
        button.addEventListener('click', () => {
            updateStagePresetUI(button.dataset.stagePreset);
        });
    });

    fromLevelSelect?.addEventListener('change', () => {
        syncCustomStageTargetOptions(parseInt(toLevelSelect?.value, 10));
    });

    updateStagePresetUI(getSelectedStagePreset());
}

// cost 계산 (비율 가중 합계 방식)
// supply가 0인 키트: 사용량 0이면 cost 0, 사용량 > 0이면 Infinity (사용 불가)
function calculateDays(basicUsed, mediumUsed, highUsed, kitInfo) {
    const calcCost = (used, supply) => {
        if (supply === 0) return used > 0 ? Infinity : 0;
        return (used * 10) / supply;
    };
    const costBasic = calcCost(basicUsed, kitInfo.basic.supply);
    const costMedium = calcCost(mediumUsed, kitInfo.medium.supply);
    const costHigh = calcCost(highUsed, kitInfo.high.supply);
    return costBasic + costMedium + costHigh;
}

// SR등급 필요 경험치 (레벨당)
const REQUIRED_EXP = 3000;

// 시뮬레이션 횟수
const SIMULATION_COUNT = 100000;

/**
 * 5의 배수 구간 정보 반환
 */
function getLevelSection(level) {
    return LEVEL_SECTIONS.find(section => level < section.end) || LEVEL_SECTIONS[LEVEL_SECTIONS.length - 1];
}

function getActiveLevelSegments(startLevel, targetLevel) {
    return LEVEL_SECTIONS
        .map(section => {
            const segmentStart = Math.max(startLevel, section.start);
            const segmentEnd = Math.min(targetLevel, section.end);

            if (segmentStart >= segmentEnd) {
                return null;
            }

            return {
                baseStart: section.start,
                start: segmentStart,
                endExclusive: segmentEnd,
                endInclusive: segmentEnd - 1,
                label: `${formatLevelRange(segmentStart, segmentEnd)} 구간`
            };
        })
        .filter(Boolean);
}

/**
 * 단일 레벨 강화 시뮬레이션 (level → level+1, 대성공 시 구간 끝으로)
 * 조합: 상급 h개 + 중급 m개 + 나머지 초급
 * 반환: { days, basicUsed, mediumUsed, highUsed, jumped, jumpTo }
 */
const MDP_ACTION_ORDER_TEMPLATES = [
    { id: 'HMB', order: ['high', 'medium', 'basic'] },
    { id: 'MHB', order: ['medium', 'high', 'basic'] }
];

function getBasicCountForAction(highCount, mediumCount) {
    const expFromHighMedium = (highCount * 1000) + (mediumCount * 500);
    return Math.max(0, Math.ceil((REQUIRED_EXP - expFromHighMedium) / 200));
}

function getActionAttemptSequence(action) {
    const sequence = [];
    for (const type of action.order) {
        const count =
            type === 'high' ? action.high :
                type === 'medium' ? action.medium :
                    action.basicCount;

        for (let i = 0; i < count; i++) {
            sequence.push(type);
        }
    }
    return sequence;
}

function buildLegacyMdpActionName(action) {
    const highColor = '#fbbf24';
    const medColor = '#a855f7';
    const basicColor = '#3b82f6';
    const parts = [];

    for (const type of action.order) {
        if (type === 'high' && action.high > 0) {
            parts.push(`<span style="color:${highColor}">노랑 ${action.high}회</span>`);
        } else if (type === 'medium' && action.medium > 0) {
            parts.push(`<span style="color:${medColor}">보라 ${action.medium}회</span>`);
        } else if (type === 'basic' && action.basicCount > 0) {
            if (action.high === 0 && action.medium === 0) {
                parts.push(`<span style="color:${basicColor}">파랑 ${action.basicCount}회</span>`);
            } else {
                parts.push(`나머지 <span style="color:${basicColor}">파랑</span>`);
            }
        }
    }

    return parts.join(', ');
}

function getActionColorInfo(type) {
    if (type === 'high') {
        return { label: '노랑', color: '#fbbf24' };
    }
    if (type === 'medium') {
        return { label: '보라', color: '#a855f7' };
    }
    return { label: '파랑', color: '#3b82f6' };
}

function getActionSequenceRuns(action) {
    const runs = [];
    for (const type of action.sequence || []) {
        const lastRun = runs[runs.length - 1];
        if (lastRun && lastRun.type === type) {
            lastRun.count++;
        } else {
            runs.push({ type, count: 1 });
        }
    }
    return runs;
}

function formatActionRunLabel(type, count) {
    const info = getActionColorInfo(type);
    return `<span style="color:${info.color}">${info.label} ${count}번</span>`;
}

function buildMdpActionName(action, options = {}) {
    const { singleStepLabel = false } = options;
    const runs = getActionSequenceRuns(action);

    if (runs.length === 0) {
        return '-';
    }

    if (singleStepLabel && runs.length === 1) {
        return formatActionRunLabel(runs[0].type, 1);
    }

    return runs.map(run => formatActionRunLabel(run.type, run.count)).join(', ');
}

function createMdpAction(highCount, mediumCount, orderId = 'HMB') {
    const template = MDP_ACTION_ORDER_TEMPLATES.find(item => item.id === orderId) || MDP_ACTION_ORDER_TEMPLATES[0];
    const action = {
        id: `${highCount}-${mediumCount}-${template.id}`,
        orderId: template.id,
        order: [...template.order],
        high: highCount,
        medium: mediumCount,
        basicCount: getBasicCountForAction(highCount, mediumCount)
    };

    action.sequence = getActionAttemptSequence(action);
    action.name = buildMdpActionName(action);
    return action;
}

const MDP_DEFAULT_ACTION = createMdpAction(0, 0, 'HMB');

function normalizeMdpAction(actionOrHighCount, mediumCount = 0) {
    if (typeof actionOrHighCount === 'object' && actionOrHighCount !== null) {
        return actionOrHighCount;
    }
    return createMdpAction(actionOrHighCount || 0, mediumCount || 0, 'HMB');
}

function evaluateLevelActionExact(level, action, kitInfo) {
    let reachProbability = 1;
    let basicUsed = 0;
    let mediumUsed = 0;
    let highUsed = 0;

    for (const type of action.sequence) {
        if (type === 'basic') basicUsed += reachProbability;
        if (type === 'medium') mediumUsed += reachProbability;
        if (type === 'high') highUsed += reachProbability;

        const successRate = SR_SUCCESS_RATES[level][type] / 100;
        reachProbability *= (1 - successRate);
    }

    const jumpRate = 1 - reachProbability;
    return {
        days: calculateDays(basicUsed, mediumUsed, highUsed, kitInfo),
        basic: basicUsed,
        medium: mediumUsed,
        high: highUsed,
        basicUsed,
        mediumUsed,
        highUsed,
        jumpRate,
        jumpTo: getLevelSection(level).targetLevel
    };
}

function generateAllActions(supply) {
    const actions = [];

    for (let h = 0; h <= 3; h++) {
        for (let m = 0; m <= 6; m++) {
            if (supply.high === 0 && h > 0) continue;
            if (supply.medium === 0 && m > 0) continue;

            const expFromHighMedium = (h * 1000) + (m * 500);
            if (expFromHighMedium > REQUIRED_EXP) continue;

            const needsBasic = expFromHighMedium < REQUIRED_EXP;
            if (supply.basic === 0 && needsBasic) continue;

            const orderIds = (h > 0 && m > 0)
                ? MDP_ACTION_ORDER_TEMPLATES.map(item => item.id)
                : ['HMB'];

            for (const orderId of orderIds) {
                actions.push(createMdpAction(h, m, orderId));
            }
        }
    }

    return actions;
}

function buildActionStatsCache(startLevel, actions, kitInfo, targetLevel = MAX_LEVEL) {
    const cache = {};
    for (let level = startLevel; level < targetLevel; level++) {
        cache[level] = {};
        for (const action of actions) {
            cache[level][action.id] = evaluateLevelActionExact(level, action, kitInfo);
        }
    }
    return cache;
}

function getInventoryAttemptCaps(supply) {
    return {
        basic: Math.max(0, Math.floor(supply.basic / 10)),
        medium: Math.max(0, Math.floor(supply.medium / 10)),
        high: Math.max(0, Math.floor(supply.high / 10))
    };
}

function evaluateLevelActionOutcomes(level, action) {
    const outcomes = [];
    let reachProbability = 1;
    let basicUsed = 0;
    let mediumUsed = 0;
    let highUsed = 0;
    const jumpTo = getLevelSection(level).targetLevel;

    for (const type of action.sequence) {
        if (type === 'basic') basicUsed++;
        if (type === 'medium') mediumUsed++;
        if (type === 'high') highUsed++;

        const successRate = SR_SUCCESS_RATES[level][type] / 100;
        const successProbability = reachProbability * successRate;
        if (successProbability > 0) {
            outcomes.push({
                probability: successProbability,
                basicUsed,
                mediumUsed,
                highUsed,
                jumped: true,
                jumpTo
            });
        }
        reachProbability *= (1 - successRate);
    }

    if (reachProbability > 0) {
        outcomes.push({
            probability: reachProbability,
            basicUsed,
            mediumUsed,
            highUsed,
            jumped: false,
            jumpTo: level + 1
        });
    }

    return outcomes;
}

function buildActionOutcomeCache(startLevel, actions, targetLevel = MAX_LEVEL) {
    const cache = {};
    for (let level = startLevel; level < targetLevel; level++) {
        cache[level] = {};
        for (const action of actions) {
            cache[level][action.id] = evaluateLevelActionOutcomes(level, action);
        }
    }
    return cache;
}

function buildFutureUsageBounds(startLevel, actions, targetLevel = MAX_LEVEL) {
    const maxUsagePerLevel = actions.reduce((maxUsage, action) => ({
        basic: Math.max(maxUsage.basic, action.basicCount),
        medium: Math.max(maxUsage.medium, action.medium),
        high: Math.max(maxUsage.high, action.high)
    }), { basic: 0, medium: 0, high: 0 });

    const bounds = {};
    for (let level = startLevel; level < targetLevel; level++) {
        const remainingLevels = targetLevel - level;
        bounds[level] = {
            basic: maxUsagePerLevel.basic * remainingLevels,
            medium: maxUsagePerLevel.medium * remainingLevels,
            high: maxUsagePerLevel.high * remainingLevels
        };
    }

    return bounds;
}

function comparePolicyCandidates(a, b, tolerance) {
    const aInTolerance = a.ratioError <= tolerance;
    const bInTolerance = b.ratioError <= tolerance;

    if (aInTolerance !== bInTolerance) {
        return aInTolerance ? -1 : 1;
    }

    if (aInTolerance && bInTolerance) {
        return (a.cost - b.cost) || (a.ratioError - b.ratioError);
    }

    return (a.ratioError - b.ratioError) || (a.cost - b.cost);
}

function createZeroUsage() {
    return { basic: 0, medium: 0, high: 0 };
}

function buildUsageMetrics(usage, supply, kitInfo) {
    return {
        ratioError: calculateRatioError(usage.basic, usage.medium, usage.high, supply),
        cost: calculateDays(usage.basic, usage.medium, usage.high, kitInfo)
    };
}

function pruneParetoCandidatesHeuristic(candidates) {
    candidates.sort((a, b) => (a.ratioError - b.ratioError) || (a.cost - b.cost));
    const pruned = [];
    let bestCost = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
        if (candidate.cost + 1e-12 < bestCost) {
            pruned.push(candidate);
            bestCost = candidate.cost;
        }
    }

    return pruned;
}

function generateSectionCandidates(level, sectionEnd, childFrontier, actions, actionStatsCache, supply, kitInfo) {
    const candidates = [];

    for (const child of childFrontier) {
        const nextSectionUsage = level === sectionEnd ? child.usage : child.nextSectionUsage;

        for (const action of actions) {
            const stats = actionStatsCache[level][action.id];
            const failUsage = child.usage;
            const jumpUsage = nextSectionUsage;
            const usage = {
                basic: stats.basic + ((1 - stats.jumpRate) * failUsage.basic) + (stats.jumpRate * jumpUsage.basic),
                medium: stats.medium + ((1 - stats.jumpRate) * failUsage.medium) + (stats.jumpRate * jumpUsage.medium),
                high: stats.high + ((1 - stats.jumpRate) * failUsage.high) + (stats.jumpRate * jumpUsage.high)
            };

            candidates.push({
                usage,
                nextSectionUsage,
                strategies: { ...child.strategies, [level]: action },
                ...buildUsageMetrics(usage, supply, kitInfo)
            });
        }
    }

    return candidates;
}

function applySectionCandidatePruning(candidates, pruning) {
    if (pruning === 'none') {
        return candidates;
    }

    if (pruning === 'heuristic') {
        return pruneParetoCandidatesHeuristic(candidates);
    }

    throw new Error(`Unknown pruning mode: ${pruning}`);
}

function buildSectionParetoFrontier(sectionStart, sectionEnd, nextFrontier, actions, actionStatsCache, supply, kitInfo, options = {}) {
    const pruning = options.pruning || 'none';
    const frontiers = {};
    let childFrontier = nextFrontier;

    for (let level = sectionEnd; level >= sectionStart; level--) {
        const candidates = generateSectionCandidates(
            level,
            sectionEnd,
            childFrontier,
            actions,
            actionStatsCache,
            supply,
            kitInfo
        );
        childFrontier = applySectionCandidatePruning(candidates, pruning);
        frontiers[level] = childFrontier;
    }

    return frontiers;
}

function normalizeSolverOptions(options = {}) {
    return {
        pruning: options.pruning || 'heuristic',
        simulationCount: options.simulationCount || 30000,
        sectionPruning: options.sectionPruning || {}
    };
}

function getSectionPruningMode(sectionStart, options) {
    return options.sectionPruning[sectionStart] || options.pruning;
}

function findOptimalPathWithExactMDPCore(startLevel, supply, options = {}) {
    const solverOptions = normalizeSolverOptions(options);
    const targetLevel = normalizeTargetLevel(options.targetLevel);
    const tolerance = getTolerancePercent();
    const kitInfo = createKitInfoFromSupply(supply);
    const actions = generateAllActions(supply);
    const actionStatsCache = buildActionStatsCache(startLevel, actions, kitInfo, targetLevel);
    const terminalFrontier = [{
        usage: createZeroUsage(),
        nextSectionUsage: createZeroUsage(),
        strategies: {},
        ...buildUsageMetrics(createZeroUsage(), supply, kitInfo)
    }];
    const frontierByLevel = {};
    let nextFrontier = terminalFrontier;
    const activeSegments = getActiveLevelSegments(startLevel, targetLevel);

    for (let i = activeSegments.length - 1; i >= 0; i--) {
        const segment = activeSegments[i];
        const segmentFrontier = buildSectionParetoFrontier(
            segment.start,
            segment.endInclusive,
            nextFrontier,
            actions,
            actionStatsCache,
            supply,
            kitInfo,
            { pruning: getSectionPruningMode(segment.baseStart, solverOptions) }
        );
        Object.assign(frontierByLevel, segmentFrontier);
        nextFrontier = segmentFrontier[segment.start];
    }

    const candidates = [...(frontierByLevel[startLevel] || [])].sort((a, b) => comparePolicyCandidates(a, b, tolerance));
    if (candidates.length === 0) {
        throw new Error('No candidates generated for the requested path search.');
    }

    const bestPath = candidates[0];
    const optimalStrategies = bestPath.strategies;
    const levelResults = {};

    for (let level = startLevel; level < targetLevel; level++) {
        const action = optimalStrategies[level];
        if (!action) continue;
        const result = actionStatsCache[level][action.id];
        levelResults[level] = [{
            ...action,
            ...result,
            expectedToEnd: result.days
        }];
    }

    const fullPathResult = simulateFullPathAverage(startLevel, optimalStrategies, solverOptions.simulationCount, kitInfo, targetLevel);
    fullPathResult.totalDays = bestPath.cost;
    fullPathResult.basicUsed = bestPath.usage.basic;
    fullPathResult.mediumUsed = bestPath.usage.medium;
    fullPathResult.highUsed = bestPath.usage.high;
    fullPathResult.ratioError = bestPath.ratioError;
    return {
        mode: SOLVER_MODES.AVERAGE,
        startLevel,
        targetLevel,
        actionCount: actions.length,
        levelResults,
        optimalStrategies,
        fullPathResult,
        solverOptions,
        bestPath: {
            ...bestPath,
            totalBasic: bestPath.usage.basic,
            totalMedium: bestPath.usage.medium,
            totalHigh: bestPath.usage.high,
            error: bestPath.ratioError
        }
    };
}

function findOptimalPathWithExactMDP(startLevel, options = {}) {
    return findOptimalPathWithExactMDPCore(startLevel, getKitSupply(), options);
}

function simulateLevelOnce(level, actionOrHighCount, mediumCount, kitInfo) {
    const action = normalizeMdpAction(actionOrHighCount, mediumCount);
    let basicUsed = 0;
    let mediumUsed = 0;
    let highUsed = 0;
    const section = getLevelSection(level);

    for (const type of action.sequence) {
        if (type === 'basic') basicUsed++;
        if (type === 'medium') mediumUsed++;
        if (type === 'high') highUsed++;

        if (Math.random() < SR_SUCCESS_RATES[level][type] / 100) {
            const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
            return { days, basicUsed, mediumUsed, highUsed, jumped: true, jumpTo: section.targetLevel };
        }
    }

    const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
    return { days, basicUsed, mediumUsed, highUsed, jumped: false, jumpTo: level + 1 };
}

function simulateCoverageLevelOnce(level, action, remainingBasic, remainingMedium, remainingHigh, kitInfo) {
    let basicUsed = 0;
    let mediumUsed = 0;
    let highUsed = 0;
    const section = getLevelSection(level);

    for (const type of action.sequence) {
        const remainingForType =
            type === 'basic' ? (remainingBasic - basicUsed) :
                type === 'medium' ? (remainingMedium - mediumUsed) :
                    (remainingHigh - highUsed);

        if (remainingForType <= 0) {
            const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
            return {
                days,
                basicUsed,
                mediumUsed,
                highUsed,
                jumped: false,
                jumpTo: level,
                exhausted: true,
                shortageType: type
            };
        }

        if (type === 'basic') basicUsed++;
        if (type === 'medium') mediumUsed++;
        if (type === 'high') highUsed++;

        if (Math.random() < SR_SUCCESS_RATES[level][type] / 100) {
            const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
            return {
                days,
                basicUsed,
                mediumUsed,
                highUsed,
                jumped: true,
                jumpTo: section.targetLevel,
                exhausted: false,
                shortageType: null
            };
        }
    }

    const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
    return {
        days,
        basicUsed,
        mediumUsed,
        highUsed,
        jumped: false,
        jumpTo: level + 1,
        exhausted: false,
        shortageType: null
    };
}

function simulateLevelAverage(level, actionOrHighCount, mediumCount) {
    const kitInfo = getKitInfo();
    const action = normalizeMdpAction(actionOrHighCount, mediumCount);
    return evaluateLevelActionExact(level, action, kitInfo);
}

function simulateFullPathOnce(startLevel, levelStrategies, kitInfo, targetLevel = MAX_LEVEL) {
    let currentLevel = startLevel;
    let totalBasic = 0;
    let totalMedium = 0;
    let totalHigh = 0;
    const levelStats = {};

    while (currentLevel < targetLevel) {
        const strategy = normalizeMdpAction(levelStrategies[currentLevel] || MDP_DEFAULT_ACTION);
        const result = simulateLevelOnce(currentLevel, strategy, 0, kitInfo);

        totalBasic += result.basicUsed;
        totalMedium += result.mediumUsed;
        totalHigh += result.highUsed;

        if (!levelStats[currentLevel]) {
            levelStats[currentLevel] = { days: 0, count: 0, basic: 0, medium: 0, high: 0 };
        }
        levelStats[currentLevel].days += result.days;
        levelStats[currentLevel].count++;
        levelStats[currentLevel].basic += result.basicUsed;
        levelStats[currentLevel].medium += result.mediumUsed;
        levelStats[currentLevel].high += result.highUsed;

        currentLevel = result.jumpTo;
    }

    const totalDays = calculateDays(totalBasic, totalMedium, totalHigh, kitInfo);
    return { totalDays, totalBasic, totalMedium, totalHigh, levelStats };
}

function simulateFullPathAverage(startLevel, levelStrategies, simCount = SIMULATION_COUNT, kitInfo = getKitInfo(), targetLevel = MAX_LEVEL) {
    let daysSum = 0;
    let basicSum = 0;
    let mediumSum = 0;
    let highSum = 0;
    const levelStatsAgg = {};

    const distributions = {
        basic: [],
        medium: [],
        high: [],
        days: []
    };

    for (let l = startLevel; l < targetLevel; l++) {
        levelStatsAgg[l] = { daysSum: 0, countSum: 0, basicSum: 0, mediumSum: 0, highSum: 0, visitCount: 0 };
    }

    for (let i = 0; i < simCount; i++) {
        const result = simulateFullPathOnce(startLevel, levelStrategies, kitInfo, targetLevel);
        daysSum += result.totalDays;
        basicSum += result.totalBasic;
        mediumSum += result.totalMedium;
        highSum += result.totalHigh;

        distributions.basic.push(result.totalBasic);
        distributions.medium.push(result.totalMedium);
        distributions.high.push(result.totalHigh);
        distributions.days.push(result.totalDays);

        for (const level in result.levelStats) {
            const ls = result.levelStats[level];
            levelStatsAgg[level].daysSum += ls.days;
            levelStatsAgg[level].countSum += ls.count;
            levelStatsAgg[level].basicSum += ls.basic;
            levelStatsAgg[level].mediumSum += ls.medium;
            levelStatsAgg[level].highSum += ls.high;
            levelStatsAgg[level].visitCount++;
        }
    }

    const levelAverages = {};
    for (const level in levelStatsAgg) {
        const ls = levelStatsAgg[level];
        if (ls.visitCount > 0) {
            levelAverages[level] = {
                avgDays: ls.daysSum / ls.visitCount,
                avgBasic: ls.basicSum / ls.visitCount,
                avgMedium: ls.mediumSum / ls.visitCount,
                avgHigh: ls.highSum / ls.visitCount,
                visitRate: ls.visitCount / simCount
            };
        }
    }

    return {
        totalDays: daysSum / simCount,
        basicUsed: basicSum / simCount,
        mediumUsed: mediumSum / simCount,
        highUsed: highSum / simCount,
        levelAverages,
        distributions
    };
}

function simulateCoveragePolicy(startLevel, attemptCaps, solveCoverageState, simCount = SIMULATION_COUNT, kitInfo = getKitInfo(), targetLevel = MAX_LEVEL) {
    let daysSum = 0;
    let basicSum = 0;
    let mediumSum = 0;
    let highSum = 0;
    let successCount = 0;
    let successDaysSum = 0;
    let successBasicSum = 0;
    let successMediumSum = 0;
    let successHighSum = 0;
    const levelStatsAgg = {};
    const levelActionCounts = {};
    const shortageCounts = { basic: 0, medium: 0, high: 0 };
    const successTraces = [];

    const distributions = {
        basic: [],
        medium: [],
        high: [],
        days: []
    };
    const successDistributions = {
        basic: [],
        medium: [],
        high: [],
        days: []
    };

    for (let l = startLevel; l < targetLevel; l++) {
        levelStatsAgg[l] = { daysSum: 0, countSum: 0, basicSum: 0, mediumSum: 0, highSum: 0, visitCount: 0 };
        levelActionCounts[l] = {};
    }

    for (let i = 0; i < simCount; i++) {
        let currentLevel = startLevel;
        let remainingBasic = attemptCaps.basic;
        let remainingMedium = attemptCaps.medium;
        let remainingHigh = attemptCaps.high;
        let totalBasic = 0;
        let totalMedium = 0;
        let totalHigh = 0;
        let shortageTriggered = false;
        const levelStats = {};
        const traceSteps = [];

        while (currentLevel < targetLevel) {
            const stateDecision = solveCoverageState(currentLevel, remainingBasic, remainingMedium, remainingHigh);
            const action = stateDecision.action;
            if (!action) {
                break;
            }

            levelActionCounts[currentLevel][action.id] = (levelActionCounts[currentLevel][action.id] || 0) + 1;
            const result = simulateCoverageLevelOnce(
                currentLevel,
                action,
                remainingBasic,
                remainingMedium,
                remainingHigh,
                kitInfo
            );

            totalBasic += result.basicUsed;
            totalMedium += result.mediumUsed;
            totalHigh += result.highUsed;
            traceSteps.push({
                level: currentLevel,
                actionId: action.id,
                basicUsed: result.basicUsed,
                mediumUsed: result.mediumUsed,
                highUsed: result.highUsed,
                jumped: result.jumped,
                jumpTo: result.jumpTo
            });

            if (!levelStats[currentLevel]) {
                levelStats[currentLevel] = { days: 0, count: 0, basic: 0, medium: 0, high: 0 };
            }
            levelStats[currentLevel].days += result.days;
            levelStats[currentLevel].count++;
            levelStats[currentLevel].basic += result.basicUsed;
            levelStats[currentLevel].medium += result.mediumUsed;
            levelStats[currentLevel].high += result.highUsed;

            remainingBasic -= result.basicUsed;
            remainingMedium -= result.mediumUsed;
            remainingHigh -= result.highUsed;

            if (result.exhausted) {
                if (result.shortageType && shortageCounts[result.shortageType] != null) {
                    shortageCounts[result.shortageType]++;
                }
                shortageTriggered = true;
                break;
            }

            if (remainingBasic < 0 || remainingMedium < 0 || remainingHigh < 0) {
                if (remainingBasic < 0) shortageCounts.basic++;
                if (remainingMedium < 0) shortageCounts.medium++;
                if (remainingHigh < 0) shortageCounts.high++;
                shortageTriggered = true;
                break;
            }

            currentLevel = result.jumpTo;
        }

        const totalDays = calculateDays(totalBasic, totalMedium, totalHigh, kitInfo);
        const reachedTarget = currentLevel >= targetLevel && !shortageTriggered;

        daysSum += totalDays;
        basicSum += totalBasic;
        mediumSum += totalMedium;
        highSum += totalHigh;

        distributions.basic.push(totalBasic);
        distributions.medium.push(totalMedium);
        distributions.high.push(totalHigh);
        distributions.days.push(totalDays);

        if (reachedTarget) {
            successCount++;
            successDaysSum += totalDays;
            successBasicSum += totalBasic;
            successMediumSum += totalMedium;
            successHighSum += totalHigh;
            successDistributions.basic.push(totalBasic);
            successDistributions.medium.push(totalMedium);
            successDistributions.high.push(totalHigh);
            successDistributions.days.push(totalDays);
            successTraces.push({
                totalBasic,
                totalMedium,
                totalHigh,
                steps: traceSteps
            });
        }

        for (const level in levelStats) {
            const ls = levelStats[level];
            levelStatsAgg[level].daysSum += ls.days;
            levelStatsAgg[level].countSum += ls.count;
            levelStatsAgg[level].basicSum += ls.basic;
            levelStatsAgg[level].mediumSum += ls.medium;
            levelStatsAgg[level].highSum += ls.high;
            levelStatsAgg[level].visitCount++;
        }
    }

    const levelAverages = {};
    for (const level in levelStatsAgg) {
        const ls = levelStatsAgg[level];
        if (ls.visitCount > 0) {
            levelAverages[level] = {
                avgDays: ls.daysSum / ls.visitCount,
                avgBasic: ls.basicSum / ls.visitCount,
                avgMedium: ls.mediumSum / ls.visitCount,
                avgHigh: ls.highSum / ls.visitCount,
                visitRate: ls.visitCount / simCount
            };
        }
    }

    return {
        totalDays: daysSum / simCount,
        basicUsed: basicSum / simCount,
        mediumUsed: mediumSum / simCount,
        highUsed: highSum / simCount,
        levelAverages,
        distributions,
        successDistributions,
        levelActionCounts,
        shortageCounts,
        successTraces,
        simulatedCoverageRate: successCount / simCount,
        successCount,
        failureCount: simCount - successCount,
        successAverages: successCount > 0 ? {
            totalDays: successDaysSum / successCount,
            basicUsed: successBasicSum / successCount,
            mediumUsed: successMediumSum / successCount,
            highUsed: successHighSum / successCount
        } : null
    };
}

function buildSingleAttemptActionStats(level, action, kitInfo) {
    const firstType = action.sequence?.[0];
    if (!firstType) return null;

    const basicUsed = firstType === 'basic' ? 1 : 0;
    const mediumUsed = firstType === 'medium' ? 1 : 0;
    const highUsed = firstType === 'high' ? 1 : 0;

    return {
        days: calculateDays(basicUsed, mediumUsed, highUsed, kitInfo),
        basic: basicUsed,
        medium: mediumUsed,
        high: highUsed,
        basicUsed,
        mediumUsed,
        highUsed,
        jumpRate: SR_SUCCESS_RATES[level][firstType] / 100,
        jumpTo: getLevelSection(level).targetLevel
    };
}

function buildCoverageLevelResults(startLevel, levelActionCounts, actionsById, actionStatsCache, jumpRequiredLevels, kitInfo, targetLevel = MAX_LEVEL) {
    const levelResults = {};

    for (let level = startLevel; level < targetLevel; level++) {
        const actionCounts = levelActionCounts[level] || {};
        const entries = Object.entries(actionCounts);
        if (entries.length === 0) continue;

        entries.sort((a, b) => b[1] - a[1]);
        const [representativeActionId, representativeCount] = entries[0];
        const totalSelections = entries.reduce((sum, [, count]) => sum + count, 0);
        const action = actionsById[representativeActionId];
        const result = actionStatsCache[level][representativeActionId];
        const actionRuns = getActionSequenceRuns(action);
        const shouldUseSingleAttemptStats =
            jumpRequiredLevels?.[level] === true
            && actionRuns.length === 1
            && actionRuns[0].count > 1;
        const displayResult = shouldUseSingleAttemptStats
            ? buildSingleAttemptActionStats(level, action, kitInfo)
            : result;

        levelResults[level] = [{
            ...action,
            ...displayResult,
            name: buildMdpActionName(action, { singleStepLabel: shouldUseSingleAttemptStats }),
            expectedToEnd: displayResult.days,
            actionUseRate: representativeCount / totalSelections,
            adaptiveActionCount: entries.length,
            displayAsSingleAttempt: shouldUseSingleAttemptStats
        }];
    }

    return levelResults;
}

function buildCoverageStepActionName(step, actionsById) {
    const action = actionsById[step.actionId];
    if (!action) return '-';

    const usedAttemptCount = step.basicUsed + step.mediumUsed + step.highUsed;
    const truncatedAction = {
        sequence: (action.sequence || []).slice(0, usedAttemptCount)
    };
    return buildMdpActionName(truncatedAction);
}

function getCoverageTraceStepJumpRate(step, actionsById) {
    const action = actionsById[step.actionId];
    const usedAttemptCount = step.basicUsed + step.mediumUsed + step.highUsed;
    if (!action || usedAttemptCount <= 0) return 0;

    const truncatedSequence = (action.sequence || []).slice(0, usedAttemptCount);
    let reachProbability = 1;
    for (const type of truncatedSequence) {
        if (!type) return 0;

        const successRate = (SR_SUCCESS_RATES[step.level]?.[type] || 0) / 100;
        reachProbability *= (1 - successRate);
    }

    return 1 - reachProbability;
}

function buildCoverageRepresentativeSuccessPath(fullPathResult, reachableTopPercent, actionsById) {
    const successTraces = fullPathResult.successTraces || [];
    if (successTraces.length === 0) return null;

    const successDist = fullPathResult.successDistributions || fullPathResult.distributions;
    const targetBasic = getDistributionPercentile(successDist.basic, 100);
    const targetMedium = getDistributionPercentile(successDist.medium, 100);
    const targetHigh = getDistributionPercentile(successDist.high, 100);

    let bestScore = Number.POSITIVE_INFINITY;
    let bestCandidates = [];

    for (const trace of successTraces) {
        const score =
            Math.abs(trace.totalBasic - targetBasic) +
            Math.abs(trace.totalMedium - targetMedium) +
            Math.abs(trace.totalHigh - targetHigh);

        if (score + 1e-12 < bestScore) {
            bestScore = score;
            bestCandidates = [trace];
        } else if (Math.abs(score - bestScore) <= 1e-12) {
            bestCandidates.push(trace);
        }
    }

    const grouped = new Map();
    for (const trace of bestCandidates) {
        const signature = trace.steps
            .map(step => `${step.level}:${step.jumpTo}:${step.basicUsed},${step.mediumUsed},${step.highUsed}`)
            .join('|');
        const existing = grouped.get(signature);
        if (existing) {
            existing.count++;
        } else {
            grouped.set(signature, { trace, count: 1 });
        }
    }

    let selected = null;
    for (const entry of grouped.values()) {
        if (!selected || entry.count > selected.count) {
            selected = entry;
        }
    }
    if (!selected) return null;

    let remainingBasic = fullPathResult.attemptCaps.basic;
    let remainingMedium = fullPathResult.attemptCaps.medium;
    let remainingHigh = fullPathResult.attemptCaps.high;
    let cumulativeBasic = 0;
    let cumulativeMedium = 0;
    let cumulativeHigh = 0;

    const steps = selected.trace.steps.map(step => {
        const availableBasic = remainingBasic;
        const availableMedium = remainingMedium;
        const availableHigh = remainingHigh;
        cumulativeBasic += step.basicUsed;
        cumulativeMedium += step.mediumUsed;
        cumulativeHigh += step.highUsed;
        remainingBasic -= step.basicUsed;
        remainingMedium -= step.mediumUsed;
        remainingHigh -= step.highUsed;

        return {
            ...step,
            actionName: buildCoverageStepActionName(step, actionsById),
            jumpRate: getCoverageTraceStepJumpRate(step, actionsById),
            cumulativeBasic,
            cumulativeMedium,
            cumulativeHigh,
            availableBasic,
            availableMedium,
            availableHigh,
            remainingBasic,
            remainingMedium,
            remainingHigh
        };
    });

    return {
        targetBasic,
        targetMedium,
        targetHigh,
        matchCount: selected.count,
        candidateCount: bestCandidates.length,
        steps
    };
}

function findOptimalPathWithCoverageCore(startLevel, supply, options = {}) {
    const solverOptions = normalizeSolverOptions(options);
    const targetLevel = normalizeTargetLevel(options.targetLevel);
    const kitInfo = createKitInfoFromSupply(supply);
    const attemptCaps = getInventoryAttemptCaps(supply);
    const actions = generateAllActions(attemptCaps);
    const actionsById = Object.fromEntries(actions.map(action => [action.id, action]));
    const actionStatsCache = buildActionStatsCache(startLevel, actions, kitInfo, targetLevel);
    const actionOutcomeCache = buildActionOutcomeCache(startLevel, actions, targetLevel);
    const futureUsageBounds = buildFutureUsageBounds(startLevel, actions, targetLevel);
    const memo = new Map();
    const epsilon = 1e-12;

    function solveCoverageState(level, remainingBasic, remainingMedium, remainingHigh) {
        if (level >= targetLevel) {
            return { coverageRate: 1, action: null };
        }

        const bounds = futureUsageBounds[level];
        const clampedBasic = Math.max(0, Math.min(remainingBasic, bounds.basic));
        const clampedMedium = Math.max(0, Math.min(remainingMedium, bounds.medium));
        const clampedHigh = Math.max(0, Math.min(remainingHigh, bounds.high));
        const key = `${level}|${clampedBasic}|${clampedMedium}|${clampedHigh}`;

        if (memo.has(key)) {
            return memo.get(key);
        }

        let bestCoverageRate = 0;
        let bestAction = null;
        let bestTieCost = Number.POSITIVE_INFINITY;
        let bestTieJumpRate = -1;

        for (const action of actions) {
            let coverageRate = 0;
            for (const outcome of actionOutcomeCache[level][action.id]) {
                const nextBasic = clampedBasic - outcome.basicUsed;
                const nextMedium = clampedMedium - outcome.mediumUsed;
                const nextHigh = clampedHigh - outcome.highUsed;

                if (nextBasic < 0 || nextMedium < 0 || nextHigh < 0) {
                    continue;
                }

                coverageRate += outcome.probability * solveCoverageState(outcome.jumpTo, nextBasic, nextMedium, nextHigh).coverageRate;
            }

            const tieStats = actionStatsCache[level][action.id];
            const isBetterCoverage = coverageRate > bestCoverageRate + epsilon;
            const isEqualCoverage = Math.abs(coverageRate - bestCoverageRate) <= epsilon;
            const isBetterTie = (tieStats.days + epsilon < bestTieCost)
                || (Math.abs(tieStats.days - bestTieCost) <= epsilon && tieStats.jumpRate > bestTieJumpRate + epsilon);

            if (isBetterCoverage || (isEqualCoverage && isBetterTie)) {
                bestCoverageRate = coverageRate;
                bestAction = action;
                bestTieCost = tieStats.days;
                bestTieJumpRate = tieStats.jumpRate;
            }
        }

        const resolved = { coverageRate: bestCoverageRate, action: bestAction };
        memo.set(key, resolved);
        return resolved;
    }

    const rootState = solveCoverageState(startLevel, attemptCaps.basic, attemptCaps.medium, attemptCaps.high);
    const fullPathResult = simulateCoveragePolicy(
        startLevel,
        attemptCaps,
        solveCoverageState,
        solverOptions.simulationCount,
        kitInfo,
        targetLevel
    );

    fullPathResult.coverageRate = rootState.coverageRate;
    fullPathResult.reachableTopPercent = rootState.coverageRate * 100;
    fullPathResult.attemptCaps = attemptCaps;

    // 대성공 필수 레벨 계산: 최적 경로를 따라가며 각 레벨에서
    // "대성공 실패 시 커버리지 기여분"이 전체의 5% 미만이면 대성공 필수로 판정
    const jumpRequiredLevels = {};
    let trB = attemptCaps.basic, trM = attemptCaps.medium, trH = attemptCaps.high;

    for (let trLevel = startLevel; trLevel < targetLevel;) {
        const trState = solveCoverageState(trLevel, trB, trM, trH);
        if (!trState.action || trState.coverageRate <= epsilon) break;

        const trOutcomes = actionOutcomeCache[trLevel][trState.action.id];
        let jumpContrib = 0;
        let failContrib = 0;
        let bestJump = null;
        let bestJumpProb = -1;

        for (const oc of trOutcomes) {
            const nB = trB - oc.basicUsed;
            const nM = trM - oc.mediumUsed;
            const nH = trH - oc.highUsed;
            if (nB < 0 || nM < 0 || nH < 0) continue;

            const futCoverage = solveCoverageState(oc.jumpTo, nB, nM, nH).coverageRate;
            const contrib = oc.probability * futCoverage;

            if (oc.jumped) {
                jumpContrib += contrib;
                if (oc.probability > bestJumpProb) {
                    bestJumpProb = oc.probability;
                    bestJump = oc;
                }
            } else {
                failContrib += contrib;
            }
        }

        const totalContrib = jumpContrib + failContrib;
        if (totalContrib > 0 && failContrib / totalContrib < 0.05) {
            jumpRequiredLevels[trLevel] = true;
        }

        // 가장 확률 높은 jump outcome의 잔여 재고로 다음 구간 추적
        if (bestJump) {
            trB -= bestJump.basicUsed;
            trM -= bestJump.mediumUsed;
            trH -= bestJump.highUsed;
            trLevel = bestJump.jumpTo;
        } else {
            break;
        }
    }
    fullPathResult.jumpRequiredLevels = jumpRequiredLevels;

    const levelResults = buildCoverageLevelResults(
        startLevel,
        fullPathResult.levelActionCounts,
        actionsById,
        actionStatsCache,
        jumpRequiredLevels,
        kitInfo,
        targetLevel
    );
    fullPathResult.representativeSuccessPath = buildCoverageRepresentativeSuccessPath(
        fullPathResult,
        fullPathResult.reachableTopPercent,
        actionsById
    );

    return {
        mode: SOLVER_MODES.COVERAGE,
        startLevel,
        targetLevel,
        actionCount: actions.length,
        levelResults,
        optimalStrategies: {},
        fullPathResult,
        solverOptions,
        bestPath: {
            coverageRate: rootState.coverageRate,
            reachableTopPercent: rootState.coverageRate * 100
        }
    };
}

function findOptimalPathWithCoverage(startLevel, options = {}) {
    return findOptimalPathWithCoverageCore(startLevel, getKitSupply(), options);
}

function findOptimalPath(startLevel, options = {}) {
    const mode = options.mode || SOLVER_MODES.AVERAGE;

    if (mode === SOLVER_MODES.COVERAGE) {
        return findOptimalPathWithCoverage(startLevel, options);
    }

    return findOptimalPathWithExactMDP(startLevel, options);
}

function debugRegressionCase() {
    const supply = { basic: 320, medium: 60, high: 20 };
    const startLevel = 8;
    const epsilon = 1e-6;

    const exactBaselineResult = findOptimalPathWithExactMDPCore(startLevel, supply, {
        pruning: 'heuristic',
        sectionPruning: { 5: 'none' },
        simulationCount: 1000
    });
    const heuristicResult = findOptimalPathWithExactMDPCore(startLevel, supply, {
        simulationCount: 1000
    });

    const heuristicDeltaFromExact = heuristicResult.bestPath.cost - exactBaselineResult.bestPath.cost;
    const exactBetterThanHeuristic = exactBaselineResult.bestPath.cost + epsilon < heuristicResult.bestPath.cost;

    console.log('[debugRegressionCase] supply=320/60/20 startLevel=8');
    console.log('[debugRegressionCase] note: exact/no-pruning baseline here disables pruning on the active start section only, while the app keeps using heuristic mode to avoid OOM.');
    console.log('actionCount:', exactBaselineResult.actionCount);
    console.log('mode:', 'exact/no-pruning-baseline');
    console.log('best cost:', exactBaselineResult.bestPath.cost);
    console.log('ratioError:', exactBaselineResult.bestPath.ratioError);
    console.log('delta vs exact:', 0);
    console.log('mode:', 'heuristic');
    console.log('best cost:', heuristicResult.bestPath.cost);
    console.log('ratioError:', heuristicResult.bestPath.ratioError);
    console.log('delta vs exact:', heuristicDeltaFromExact);
    console.log('exact better than heuristic:', exactBetterThanHeuristic);
    console.log('exact baseline solver options:', exactBaselineResult.solverOptions);
    console.log('heuristic solver options:', heuristicResult.solverOptions);

    return {
        actionCount: exactBaselineResult.actionCount,
        exactBestCost: exactBaselineResult.bestPath.cost,
        exactRatioError: exactBaselineResult.bestPath.ratioError,
        heuristicBestCost: heuristicResult.bestPath.cost,
        heuristicRatioError: heuristicResult.bestPath.ratioError,
        heuristicDeltaFromExact,
        exactBetterThanHeuristic,
        epsilon
    };
}

/**
 * 상위% 분포 데이터 생성 (오름차순 정렬)
 */
function createPercentileData(arr) {
    // 오름차순 정렬 (상위 0% = 최솟값(운좋음), 상위 100% = 최댓값(운나쁨))
    const sorted = [...arr].sort((a, b) => a - b);
    const points = 100;
    const data = [];

    for (let i = 0; i <= points; i++) {
        const idx = Math.floor((i / points) * (sorted.length - 1));
        data.push({ pct: i, value: sorted[idx] });
    }

    return data;
}

/**
 * Canvas 상위% 그래프 그리기
 */
function drawPercentileChart(canvasId, data, color, label, coverageCutoffPct) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 25, right: 20, bottom: 35, left: 50 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // 커버리지 cutoff 적용: cutoff 이후 데이터는 표시하지 않음
    const hasCutoff = typeof coverageCutoffPct === 'number' && coverageCutoffPct < 100;
    const cutoffIndex = hasCutoff ? Math.ceil(coverageCutoffPct) : data.length - 1;
    const visibleData = data.slice(0, cutoffIndex + 1);

    // 오름차순 정렬된 데이터: data[0]=최솟값(운좋음), data[100]=최댓값(운나쁨)
    const minVal = visibleData[0].value;
    const maxVal = visibleData[visibleData.length - 1].value;
    const range = maxVal - minVal || 1;

    // 캔버스에 데이터 저장 (호버 이벤트용)
    canvas._chartData = { data: visibleData, color, label, minVal, maxVal, range, padding, chartWidth, chartHeight, cutoffIndex, hasCutoff };

    // 기본 그래프 그리기 함수
    function drawBase() {
        // 배경 클리어
        ctx.fillStyle = '#1e2630';
        ctx.fillRect(0, 0, width, height);

        // 그리드 라인 (가로)
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding.top + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
        }

        // 그리드 라인 (세로)
        for (let i = 0; i <= 4; i++) {
            const x = padding.left + (chartWidth / 4) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
        }

        // 영역 채우기 (visible 데이터만)
        ctx.fillStyle = color + '40';
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        visibleData.forEach((d, i) => {
            const x = padding.left + (d.pct / 100) * chartWidth;
            const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;
            ctx.lineTo(x, y);
        });
        // 마지막 visible 포인트에서 바닥으로
        const lastVisibleX = padding.left + (visibleData[visibleData.length - 1].pct / 100) * chartWidth;
        ctx.lineTo(lastVisibleX, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();

        // 라인 그리기 (visible 데이터만)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        visibleData.forEach((d, i) => {
            const x = padding.left + (d.pct / 100) * chartWidth;
            const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // cutoff 이후 영역을 어둡게 표시
        if (hasCutoff) {
            const cutoffX = padding.left + (cutoffIndex / 100) * chartWidth;
            ctx.fillStyle = 'rgba(255, 60, 60, 0.08)';
            ctx.fillRect(cutoffX, padding.top, padding.left + chartWidth - cutoffX, chartHeight);

            // cutoff 세로선
            ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 3]);
            ctx.beginPath();
            ctx.moveTo(cutoffX, padding.top);
            ctx.lineTo(cutoffX, padding.top + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            // cutoff 라벨
            ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`← 도달 가능 (${cutoffIndex}%)`, cutoffX + 50, padding.top + 12);
        }

        // 25%, 50%, 75% 표시 (cutoff 이전만)
        const drawMarker = (pct, markerColor) => {
            if (pct > cutoffIndex) return; // cutoff 이후 마커 숨김
            const x = padding.left + (pct / 100) * chartWidth;
            const matchingPoint = visibleData.find(d => d.pct === pct);
            if (!matchingPoint) return;
            const val = matchingPoint.value;
            const y = padding.top + chartHeight - ((val - minVal) / range) * chartHeight;

            // 세로 점선
            ctx.strokeStyle = markerColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, padding.top + chartHeight);
            ctx.stroke();
            ctx.setLineDash([]);

            // 점
            ctx.fillStyle = markerColor;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            // 값 라벨
            ctx.fillStyle = markerColor;
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(Math.round(val), x, y - 8);
        };

        drawMarker(25, '#22c55e');
        drawMarker(50, '#ffffff');
        drawMarker(75, '#f59e0b');

        // X축 라벨 (상위 %)
        ctx.fillStyle = '#888';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';

        for (let i = 0; i <= 4; i++) {
            const pct = i * 25;
            const x = padding.left + (i / 4) * chartWidth;
            ctx.fillText(`${pct}%`, x, height - 10);
        }

        // X축 타이틀
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.fillText('상위 %', padding.left + chartWidth / 2, height - 1);

        // Y축 라벨 (개수)
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const val = maxVal - (range / 4) * i;
            const y = padding.top + (chartHeight / 4) * i + 4;
            ctx.fillStyle = '#888';
            ctx.fillText(Math.round(val), padding.left - 5, y);
        }

        // 타이틀
        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label} 키트`, padding.left, 14);

        // 평균값 표시
        const avg = window._currentDistData[label].reduce((a, b) => a + b, 0) / window._currentDistData[label].length;
        ctx.fillStyle = '#888';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`평균: ${avg.toFixed(1)}`, width - padding.right, 14);
    }

    // 호버 점 및 툴팁 그리기
    function drawHover(pctIndex) {
        // cutoff 이후는 호버 불가
        if (pctIndex < 0 || pctIndex > cutoffIndex) return;
        const matchingPoint = visibleData.find(d => d.pct === pctIndex);
        if (!matchingPoint) return;

        const d = matchingPoint;
        const x = padding.left + (pctIndex / 100) * chartWidth;
        const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;

        // 호버 점
        ctx.fillStyle = '#00d4ff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e2630';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();

        // 세로선 (호버 위치)
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);

        // 툴팁 박스
        const tooltipText = `상위 ${pctIndex}%: ${Math.round(d.value)}개`;
        ctx.font = 'bold 11px sans-serif';
        const textWidth = ctx.measureText(tooltipText).width;
        const boxWidth = textWidth + 16;
        const boxHeight = 24;

        // 툴팁 위치 (화면 밖으로 안 나가게)
        let boxX = x - boxWidth / 2;
        if (boxX < 5) boxX = 5;
        if (boxX + boxWidth > width - 5) boxX = width - boxWidth - 5;

        let boxY = y - boxHeight - 12;
        if (boxY < 5) boxY = y + 12;

        // 박스 배경
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 4);
        ctx.fill();

        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 툴팁 텍스트
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(tooltipText, boxX + boxWidth / 2, boxY + 16);
    }

    // 기본 그래프 그리기
    drawBase();

    // 마우스 이벤트 (기존 이벤트 제거 후 추가)
    canvas.onmousemove = function (e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const mouseX = (e.clientX - rect.left) * scaleX;

        // 차트 영역 내인지 확인
        if (mouseX >= padding.left && mouseX <= padding.left + chartWidth) {
            const pct = ((mouseX - padding.left) / chartWidth) * 100;
            const pctIndex = Math.round(pct);

            drawBase();
            drawHover(pctIndex);
        } else {
            drawBase();
        }
    };

    canvas.onmouseleave = function () {
        drawBase();
    };
}

/**
 * 분포 그래프 HTML 생성 및 그리기
 */
function createDistributionHTML(distributions, coverageCutoffPct) {
    // 전역 변수에 데이터 저장 (그래프 그릴 때 사용) - 10배 적용
    window._currentDistData = {
        '초급': distributions.basic.map(x => x * 10),
        '중급': distributions.medium.map(x => x * 10),
        '상급': distributions.high.map(x => x * 10)
    };
    window._currentCoverageCutoffPct = coverageCutoffPct;

    const sampleCount = distributions.basic.length;
    const sampleLabel = sampleCount >= 10000
        ? `${(sampleCount / 10000).toFixed(sampleCount % 10000 === 0 ? 0 : 1)}만회`
        : `${sampleCount.toLocaleString('ko-KR')}회`;

    const cutoffLabel = formatCoveragePercent(coverageCutoffPct);
    const cutoffNote = typeof coverageCutoffPct === 'number' && coverageCutoffPct < 100
        ? `<div style="margin-top: 6px; font-size: 0.85rem; color: #f87171;">※ 상위 ${cutoffLabel}% 이후 구간은 도달 불가능하여 표시하지 않습니다.</div>`
        : '';

    return `
        <div class="distribution-section">
            <h4 style="color: #9ca3af; margin-bottom: 15px;">키트 사용량 분포 (${sampleLabel} 시뮬레이션)</h4>
            <div class="dist-legend" style="margin-bottom: 10px;">
                <span style="color: #22c55e;">● 상위 25%</span>
                <span style="color: #fff;">● 상위 50% (중앙값)</span>
                <span style="color: #f59e0b;">● 상위 75%</span>
            </div>
            ${cutoffNote}
            <div class="histogram-container">
                <canvas id="histBasic" width="320" height="180"></canvas>
                <canvas id="histMedium" width="320" height="180"></canvas>
                <canvas id="histHigh" width="320" height="180"></canvas>
            </div>
        </div>
    `;
}

/**
 * 그래프 그리기 (DOM 렌더링 후 호출)
 */
function drawAllHistograms(distributions, coverageCutoffPct) {
    setTimeout(() => {
        // 10배 적용된 데이터 사용
        const basicData = createPercentileData(distributions.basic.map(x => x * 10));
        const mediumData = createPercentileData(distributions.medium.map(x => x * 10));
        const highData = createPercentileData(distributions.high.map(x => x * 10));

        drawPercentileChart('histBasic', basicData, '#6b7280', '초급', coverageCutoffPct);
        drawPercentileChart('histMedium', mediumData, '#6b7280', '중급', coverageCutoffPct);
        drawPercentileChart('histHigh', highData, '#6b7280', '상급', coverageCutoffPct);
    }, 50);
}

function formatKitUsageValue(used) {
    if (!Number.isFinite(used)) return '-';
    return (used * 10).toFixed(0);
}

function formatKitUsageText(used) {
    const value = formatKitUsageValue(used);
    return value === '-' ? value : `${value}개`;
}

/**
 * 커버리지 퍼센트 포맷: 작은 값도 유효 숫자 표시
 */
function formatCoveragePercent(pct) {
    if (!Number.isFinite(pct) || pct <= 0) return '0.0';
    if (pct < 0.01) return '< 0.01';
    if (pct < 0.1) return pct.toFixed(2);
    return pct.toFixed(1);
}

function getDominantShortageLabel(shortageCounts) {
    const labels = {
        basic: '초급',
        medium: '중급',
        high: '상급'
    };
    const entries = Object.entries(shortageCounts || {}).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0 || entries[0][1] <= 0) {
        return '없음';
    }
    return labels[entries[0][0]] || '없음';
}

/**
 * 분포 배열에서 N번째 백분위수 값 추출 (raw 단위)
 * 오름차순 정렬 기준: percentile 0% = 가장 운 좋은 사람, 100% = 가장 운 나쁜 사람
 */
function getDistributionPercentile(arr, percentile) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.min(Math.floor((percentile / 100) * sorted.length), sorted.length - 1);
    return sorted[Math.max(0, index)];
}

/**
 * 재고 대비 사용량 시각적 바 생성
 * usedValDirect: 이미 10배 적용된 직접 값 (null이면 used * 10 사용)
 */
function createInventoryBarHTML(label, color, used, inventory, usedValDirect) {
    const usedVal = usedValDirect != null ? usedValDirect : (Number.isFinite(used) ? Math.round(used * 10) : 0);
    const maxVal = Math.max(usedVal, inventory, 1);
    const usedPct = Math.min((usedVal / maxVal) * 100, 100);
    const invPct = Math.min((inventory / maxVal) * 100, 100);
    const isOver = usedVal > inventory;
    const statusIcon = isOver ? '⚠' : '';
    const statusColor = isOver ? '#f87171' : '#4ade80';
    const statusText = isOver ? '(초과)' : '';
    const barColor = isOver ? '#ef4444' : color;

    return `
        <div class="inv-bar-row">
            <div class="inv-bar-header">
                <span style="color: ${color}; font-weight: 600;">${label}</span>
                <span style="color: ${statusColor}; font-size: 0.85rem;">
                    ${statusIcon} ${usedVal}개 사용 / ${inventory}개
                    <span style="opacity: 0.7;">${statusText}</span>
                </span>
            </div>
            <div class="inv-bar-track">
                <div class="inv-bar-inventory" style="width: ${invPct}%; background: rgba(255,255,255,0.1);"></div>
                <div class="inv-bar-used" style="width: ${usedPct}%; background: ${barColor};"></div>
                <div class="inv-bar-marker" style="left: ${invPct}%;" title="보유량: ${inventory}개"></div>
            </div>
        </div>
    `;
}

function formatCoverageRepresentativePathHTML(representativePath) {
    if (!representativePath || !representativePath.steps || representativePath.steps.length === 0) {
        return '';
    }

    const stepsHTML = representativePath.steps.map(step => `
        <div class="detail-item" style="display: block; padding: 10px 0;">
            <div style="display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                <span style="color: #e5e7eb; font-weight: 600;">${step.level} → ${step.jumpTo} : ${step.actionName}</span>
                <span style="color: #9ca3af;">누적 초급 ${step.cumulativeBasic * 10}개 · 남은 초급 ${Math.max(0, step.remainingBasic) * 10}개</span>
            </div>
            <div style="margin-top: 4px; color: #6b7280; font-size: 0.82rem;">
                이 단계 사용량: 초급 ${step.basicUsed * 10}개 · 중급 ${step.mediumUsed * 10}개 · 상급 ${step.highUsed * 10}개
            </div>
        </div>
    `).join('');

    return `
        <div class="ratio-info" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
            <div style="margin-bottom: 10px;">
                <span style="font-weight: bold; color: #e5e7eb;">상위 n% 대표 성공 경로</span>
            </div>
            <div style="font-size: 0.85rem; color: #9ca3af; margin-bottom: 8px;">
                요약에 표시된 사용량에 가장 가까운 성공 경로를 시뮬레이션에서 뽑았습니다.
            </div>
            <div class="result-details">
                ${stepsHTML}
            </div>
        </div>
    `;
}

/**
 * 레벨 카드용 소형 사용량 표시 (재고 대비)
 */
function createLevelUsageHTML(label, usedRaw, inventory, color) {
    const usedVal = Math.round(usedRaw * 10);
    const pct = inventory > 0 ? Math.min((usedVal / inventory) * 100, 100) : 0;
    return `
        <div class="detail-item">
            <span class="detail-label">${label}</span>
            <span class="detail-value">${usedVal}개 <span style="color: #888; font-weight: 400; font-size: 0.85em;">/ ${inventory}</span></span>
        </div>
    `;
}

function updateResultsTitle(startLevel, targetLevel) {
    const resultsTitle = document.getElementById('resultsTitle');
    if (!resultsTitle) return;

    resultsTitle.textContent = `${formatLevelRange(startLevel, targetLevel)} 최적 강화 경로`;
}

/**
 * 결과 화면 표시
 */
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const summaryBox = document.getElementById('summaryBox');
    const topResultsDiv = document.getElementById('topResults');

    resultsSection.style.display = 'block';

    const { startLevel, targetLevel, levelResults, fullPathResult, mode } = results;
    const isCoverageMode = mode === SOLVER_MODES.COVERAGE;
    let representativePathHTML = '';
    const levelRangeText = formatLevelRange(startLevel, targetLevel);
    const displaySections = getActiveLevelSegments(startLevel, targetLevel);

    updateResultsTitle(startLevel, targetLevel);

    // 실제 사용 비율 계산
    const totalUsed = fullPathResult.basicUsed + fullPathResult.mediumUsed + fullPathResult.highUsed;
    const safeTotalUsed = totalUsed || 1;
    const actualRatio = {
        basic: ((fullPathResult.basicUsed / safeTotalUsed) * 100).toFixed(1),
        medium: ((fullPathResult.mediumUsed / safeTotalUsed) * 100).toFixed(1),
        high: ((fullPathResult.highUsed / safeTotalUsed) * 100).toFixed(1)
    };

    // 목표 비율
    const supply = getKitSupply();
    const supplyTotal = supply.basic + supply.medium + supply.high || 1;
    const targetRatio = {
        basic: ((supply.basic / supplyTotal) * 100).toFixed(1),
        medium: ((supply.medium / supplyTotal) * 100).toFixed(1),
        high: ((supply.high / supplyTotal) * 100).toFixed(1)
    };

    if (isCoverageMode) {
        const reachableTopPercent = fullPathResult.reachableTopPercent || 0;
        const totalKits = supply.basic + supply.medium + supply.high;
        const coveragePercentText = formatCoveragePercent(reachableTopPercent);
        const coveragePercentLabel = `${coveragePercentText}%`;

        if (reachableTopPercent <= 0) {
            summaryBox.innerHTML = `
                <h3>전체 요약: ${levelRangeText} 레벨</h3>
                <div class="unreachable-banner">
                    <div class="unreachable-icon">✕</div>
                    <div class="unreachable-title">해당 조합으로 도달할 수 없습니다</div>
                    <div class="unreachable-detail">
                        현재 재고: 
                        <span style="color: #3b82f6;">초급</span> ${supply.basic}개 · 
                        <span style="color: #a855f7;">중급</span> ${supply.medium}개 · 
                        <span style="color: #fbbf24;">상급</span> ${supply.high}개
                        <br>
                        총 ${totalKits}개의 관리 키트로는 ${levelRangeText} 레벨 강화를 완료할 수 없습니다.
                    </div>
                </div>
            `;
            topResultsDiv.innerHTML = '';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        const dominantShortage = getDominantShortageLabel(fullPathResult.shortageCounts);
        const coverageCutoffPct = reachableTopPercent;

        // 상위 N% 기준 실제 사용량 (분포에서 N번째 백분위수)
        const dist = fullPathResult.distributions;
        const successUsageDist = (fullPathResult.successDistributions && fullPathResult.successDistributions.basic.length > 0)
            ? fullPathResult.successDistributions
            : dist;
        const pctBasic = Math.round(getDistributionPercentile(successUsageDist.basic, 100) * 10);
        const pctMedium = Math.round(getDistributionPercentile(successUsageDist.medium, 100) * 10);
        const pctHigh = Math.round(getDistributionPercentile(successUsageDist.high, 100) * 10);
        const pctLabel = `상위 ${coveragePercentLabel}`;
        const simulationWarningHTML = (fullPathResult.successCount || 0) === 0
            ? `<div class="info-message" style="margin-top: 12px;">현재 시뮬레이션 표본에서는 목표 도달 사례가 관측되지 않았습니다. 상위 구간 수치는 이론상 도달 가능 확률을 기준으로 표시됩니다.</div>`
            : '';

        summaryBox.innerHTML = `
            <h3>전체 요약: ${levelRangeText} 레벨</h3>
            <div class="coverage-banner">상위 ${coveragePercentLabel}가 목표에 도달 가능합니다.</div>
            <div class="ratio-info" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                <div style="margin-bottom: 12px;">
                    <span style="font-weight: bold; color: #e5e7eb;">상위 ${coveragePercentLabel} 기준 재고 대비 사용량</span>
                </div>
                <div class="inv-bar-container">
                    ${createInventoryBarHTML('초급', '#3b82f6', null, supply.basic, pctBasic)}
                    ${createInventoryBarHTML('중급', '#a855f7', null, supply.medium, pctMedium)}
                    ${createInventoryBarHTML('상급', '#fbbf24', null, supply.high, pctHigh)}
                </div>
                <div style="margin-top: 14px; font-size: 0.85rem; color: #9ca3af; line-height: 1.6; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px;">
                    <div style="margin-bottom: 4px;">
                        위 수치는 <strong style="color: #e5e7eb;">상위 ${coveragePercentLabel} 도달 성공 경로</strong>들 중 대표 사용량입니다.
                    </div>
                    <div>
                        가장 자주 막히는 재료: <strong style="color: #e5e7eb;">${dominantShortage}</strong>
                    </div>
                </div>
            </div>
            ${simulationWarningHTML}
            ${createDistributionHTML(fullPathResult.distributions, coverageCutoffPct)}
        `;

        // 히스토그램 그리기 (커버리지 cutoff 적용)
        drawAllHistograms(fullPathResult.distributions, coverageCutoffPct);
    } else {
        summaryBox.innerHTML = `
            <h3>전체 요약: ${levelRangeText} 레벨</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="value">${formatKitUsageValue(fullPathResult.basicUsed)}</div>
                    <div class="label">초급 키트</div>
                </div>
                <div class="summary-item">
                    <div class="value">${formatKitUsageValue(fullPathResult.mediumUsed)}</div>
                    <div class="label">중급 키트</div>
                </div>
                <div class="summary-item">
                    <div class="value">${formatKitUsageValue(fullPathResult.highUsed)}</div>
                    <div class="label">상급 키트</div>
                </div>
            </div>
            <div class="ratio-info" style="margin-top: 15px; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 10px;">
                <div style="margin-bottom: 10px;">
                    <span style="font-weight: bold; color: #e5e7eb;">사용 비율 분석</span>
                </div>
                <div style="font-size: 0.9rem; line-height: 1.8;">
                    <div>
                        <span style="color: #9ca3af;">목표:</span>
                        <span style="color: #3b82f6;">초급</span> ${targetRatio.basic}% · 
                        <span style="color: #a855f7;">중급</span> ${targetRatio.medium}% · 
                        <span style="color: #fbbf24;">상급</span> ${targetRatio.high}%
                    </div>
                    <div>
                        <span style="color: #9ca3af;">실제:</span>
                        <span style="color: #3b82f6;">초급</span> ${actualRatio.basic}% · 
                        <span style="color: #a855f7;">중급</span> ${actualRatio.medium}% · 
                        <span style="color: #fbbf24;">상급</span> ${actualRatio.high}%
                    </div>
                </div>
            </div>
            ${createDistributionHTML(fullPathResult.distributions)}
        `;

        // 히스토그램 그리기
        drawAllHistograms(fullPathResult.distributions);
    }

    // 각 구간별 레벨 결과
    topResultsDiv.innerHTML = isCoverageMode
        ? `<div class="info-message">커버리지 카드는 전체 재고를 한 번에 소모하는 조합이 아니라, 각 상태에서 가장 자주 선택된 대표 행동입니다. 남는 키트는 다음 레벨과 다음 구간을 위해 남겨둡니다.</div>`
        : '';

    const representativePathSteps = isCoverageMode
        ? (fullPathResult.representativeSuccessPath?.steps || [])
        : [];
    const representativePathStepMap = Object.fromEntries(
        ((fullPathResult.representativeSuccessPath?.steps) || []).map(step => [step.level, step])
    );
    let hasAnyLevelResults = false;

    if (isCoverageMode && representativePathSteps.length > 0) {
        topResultsDiv.innerHTML = `<div class="info-message">커버리지 아래 카드는 대표 성공 경로만 순서대로 표시합니다.</div>`;

        displaySections.forEach(section => {
            const sectionStart = section.start;
            const sectionSteps = representativePathSteps.filter(step =>
                step.level >= sectionStart && step.level < section.endExclusive
            );
            if (sectionSteps.length === 0) return;

            let sectionHTML = `<div class="section-divider">${section.label}</div>`;
            hasAnyLevelResults = true;

            for (const step of sectionSteps) {
                const combos = levelResults[step.level] || [];
                const branchCount = combos[0]?.adaptiveActionCount;
                const branchDetailHTML = Number.isFinite(branchCount)
                    ? `
                                <div class="detail-item">
                                    <span class="detail-label">상태별 분기</span>
                                    <span class="detail-value">${branchCount}개 조합</span>
                                </div>
                    `
                    : '';

                sectionHTML += `
                <div class="level-section" style="margin-bottom: 20px;">
                    <h3 style="color: #9ca3af; margin-bottom: 10px;">
                        <span>${step.level} → ${step.jumpTo} 단계</span>
                    </h3>
                    <div style="font-size: 0.85rem; color: #aaa; margin-bottom: 8px;">
                        확률: 초급 ${SR_SUCCESS_RATES[step.level].basic}% · 
                        중급 ${SR_SUCCESS_RATES[step.level].medium}% · 
                        상급 ${SR_SUCCESS_RATES[step.level].high}%
                    </div>
                    <div class="top-combos">
                        <div class="result-card rank-1" style="margin-bottom: 8px; border-width: 2px;">
                            <div class="result-header">
                                <span class="rank-badge">대표 경로</span>
                            </div>
                            <div class="combo-name" style="font-size: 1.1rem; font-weight: bold; color: #e5e7eb; margin: 10px 0; padding: 8px 12px; background: rgba(255,255,255,0.08); border-radius: 6px;">
                                ${step.actionName}
                            </div>
                            <div style="font-size: 0.85rem; color: #888; margin-bottom: 8px;">대표 성공 경로 기준 사용량 (이 구간)</div>
                            <div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px;">상위 n% 대표 성공 경로에서 실제로 사용된 구간 조합입니다.</div>
                            <div class="result-details">
                                ${createLevelUsageHTML('초급', step.basicUsed, step.availableBasic * 10, '#3b82f6')}
                                ${createLevelUsageHTML('중급', step.mediumUsed, step.availableMedium * 10, '#a855f7')}
                                ${createLevelUsageHTML('상급', step.highUsed, step.availableHigh * 10, '#fbbf24')}
                                <div class="detail-item">
                                    <span class="detail-label">대성공 확률</span>
                                    <span class="detail-value">${(step.jumpRate * 100).toFixed(1)}%</span>
                                </div>
                                ${branchDetailHTML}
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }

            topResultsDiv.innerHTML += sectionHTML;
        });

        if (!hasAnyLevelResults) {
            topResultsDiv.innerHTML += '<div class="info-message">현재 조건에서는 표시할 대표 성공 경로가 없습니다.</div>';
        }

        resultsSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    displaySections.forEach(section => {
        const sectionStart = section.start;
        let hasSectionResults = false;
        let sectionHTML = `<div class="section-divider">${section.label}</div>`;

        for (let level = sectionStart; level < section.endExclusive; level++) {
            const combos = levelResults[level];
            if (!combos) continue;
            hasSectionResults = true;
            hasAnyLevelResults = true;

            // 대성공 확률이 100%이고 해당 키트를 사용한 경우에만 조합명 override
            const badgeLabel = isCoverageMode ? '대표 행동' : '최적';
            const representativePathStep = isCoverageMode ? representativePathStepMap[level] : null;
            const badgeLabelResolved = isCoverageMode
                ? (representativePathStep ? '대표 경로' : '대표 행동')
                : '최적';
            const usageTitle = isCoverageMode
                ? (combos[0].adaptiveActionCount > 1
                    ? '1회 시도 시 기대 사용량 (남은 재고에 따라 달라질 수 있음)'
                    : '1회 시도 시 기대 사용량 (이 단계)')
                : '평균 사용량 (이 단계만)';

            // 대성공 필수 판정: 솔버가 계산한 "실패 시 커버리지 ≈ 0" 레벨
            const jumpRequiredMap = fullPathResult.jumpRequiredLevels || {};
            const isJumpRequired = isCoverageMode && jumpRequiredMap[level] === true;
            const displayName = representativePathStep ? representativePathStep.actionName : combos[0].name;
            const displayTargetLevel = representativePathStep ? representativePathStep.jumpTo : (level + 1);
            const displayBasicUsed = representativePathStep ? representativePathStep.basicUsed : combos[0].basicUsed;
            const displayMediumUsed = representativePathStep ? representativePathStep.mediumUsed : combos[0].mediumUsed;
            const displayHighUsed = representativePathStep ? representativePathStep.highUsed : combos[0].highUsed;
            const displayJumpRate = representativePathStep ? representativePathStep.jumpRate : combos[0].jumpRate;
            const displayBasicInventory = representativePathStep ? representativePathStep.availableBasic * 10 : supply.basic;
            const displayMediumInventory = representativePathStep ? representativePathStep.availableMedium * 10 : supply.medium;
            const displayHighInventory = representativePathStep ? representativePathStep.availableHigh * 10 : supply.high;
            const jumpRequiredBadgeHTML = isJumpRequired
                ? '<span class="jump-required-badge">⚡ 대성공 필수</span>'
                : '';

            const isRepresentativePathCard = isCoverageMode && representativePathStep != null;
            const isSingleAttemptCard = isCoverageMode && combos[0].displayAsSingleAttempt === true && !isRepresentativePathCard;
            const unusedCoverageActionNoteHTML = isCoverageMode
                ? `<div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px;">현재 상태에서 바로 누를 대표 행동만 보여줍니다. 남은 키트는 이후 레벨용으로 보존됩니다.</div>`
                : '';
            const coverageActionNoteHTML = isCoverageMode
                ? (isRepresentativePathCard
                    ? `<div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px;">상위 n% 대표 성공 경로에서 실제로 사용된 구간 조합입니다.</div>`
                    : `<div style="font-size: 0.8rem; color: #6b7280; margin-bottom: 8px;">현재 상태에서 바로 누를 대표 행동만 보여줍니다. 남은 키트는 이후 레벨용으로 보존됩니다.</div>`)
                : '';
            const coverageDetailHTML = isCoverageMode ? `
                                <div class="detail-item">
                                    <span class="detail-label">대표 선택률</span>
                                    <span class="detail-value">${((combos[0].actionUseRate || 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">상태별 분기</span>
                                    <span class="detail-value">${combos[0].adaptiveActionCount || 1}개 조합</span>
                                </div>
            ` : '';

            if (false) {
                displayName = `<span style="color:${highColor}">노랑1</span>`;
            } else if (false) {
                displayName = `<span style="color:${medColor}">보라1</span>`;
            } else if (false) {
                displayName = `<span style="color:${basicColor}">파랑1</span>`;
            }

            sectionHTML += `
                <div class="level-section" style="margin-bottom: 20px;">
                    <h3 style="color: #9ca3af; margin-bottom: 10px;">
                        <span>${level} → ${displayTargetLevel} 단계</span>
                        ${jumpRequiredBadgeHTML}
                    </h3>
                    <div style="font-size: 0.85rem; color: #aaa; margin-bottom: 8px;">
                        확률: 초급 ${SR_SUCCESS_RATES[level].basic}% · 
                        중급 ${SR_SUCCESS_RATES[level].medium}% · 
                        상급 ${SR_SUCCESS_RATES[level].high}%
                    </div>
                    <div class="top-combos">
                        <div class="result-card rank-1" style="margin-bottom: 8px; border-width: 2px;">
                            <div class="result-header">
                                <span class="rank-badge">${badgeLabelResolved}</span>
                            </div>
                            <div class="combo-name" style="font-size: 1.1rem; font-weight: bold; color: #e5e7eb; margin: 10px 0; padding: 8px 12px; background: rgba(255,255,255,0.08); border-radius: 6px;">
                                ${displayName}
                            </div>
                            <div style="font-size: 0.85rem; color: #888; margin-bottom: 8px;">${isRepresentativePathCard ? '대표 성공 경로 기준 사용량 (이 구간)' : (isSingleAttemptCard ? '이 조합 1회 시도 기준 사용량 (이 단계)' : usageTitle)}</div>
                            ${coverageActionNoteHTML}
                            <div class="result-details">
                                ${isCoverageMode
                    ? createLevelUsageHTML('초급', displayBasicUsed, displayBasicInventory, '#3b82f6')
                    : `<div class="detail-item"><span class="detail-label">초급</span><span class="detail-value">${(displayBasicUsed * 10).toFixed(0)}개</span></div>`
                }
                                ${isCoverageMode
                    ? createLevelUsageHTML('중급', displayMediumUsed, displayMediumInventory, '#a855f7')
                    : `<div class="detail-item"><span class="detail-label">중급</span><span class="detail-value">${(displayMediumUsed * 10).toFixed(0)}개</span></div>`
                }
                                ${isCoverageMode
                    ? createLevelUsageHTML('상급', displayHighUsed, displayHighInventory, '#fbbf24')
                    : `<div class="detail-item"><span class="detail-label">상급</span><span class="detail-value">${(displayHighUsed * 10).toFixed(0)}개</span></div>`
                }
                                <div class="detail-item">
                                    <span class="detail-label">대성공 확률</span>
                                    <span class="detail-value">${(displayJumpRate * 100).toFixed(1)}%</span>
                                </div>
                                ${coverageDetailHTML}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        if (hasSectionResults) {
            topResultsDiv.innerHTML += sectionHTML;
        }
    });

    if (!hasAnyLevelResults) {
        topResultsDiv.innerHTML += '<div class="info-message">현재 조건에서는 표시할 단계별 추천 조합이 없습니다.</div>';
    }

    // 스크롤
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * 초기화
 */
function init() {
    initSolveModeSelector();
    initStageSelector();

    // 최적 경로 계산 버튼
    document.getElementById('calculateBtn').addEventListener('click', () => {
        // 입력 검증
        if (!validateKitSupply()) {
            return;
        }

        if (!validateSelectedStageRange()) {
            return;
        }

        const { startLevel, targetLevel } = getSelectedStageRange();
        const solveMode = getSelectedSolveMode();

        // 로딩 표시
        const resultsSection = document.getElementById('resultsSection');
        const topResultsDiv = document.getElementById('topResults');
        const summaryBox = document.getElementById('summaryBox');

        resultsSection.style.display = 'block';
        updateResultsTitle(startLevel, targetLevel);
        summaryBox.innerHTML = solveMode === SOLVER_MODES.COVERAGE
            ? `<div class="info-message">커버리지 계산 중... 현재 재고로 ${formatLevelRange(startLevel, targetLevel)} 구간의 도달 가능 범위를 찾고 있습니다.</div>`
            : `<div class="info-message">평균 최적화 계산 중... ${formatLevelRange(startLevel, targetLevel)} 구간을 분석하고 있습니다.</div>`;
        topResultsDiv.innerHTML = '';

        // 비동기로 계산 (UI 블로킹 방지)
        setTimeout(() => {
            const results = findOptimalPath(startLevel, { mode: solveMode, targetLevel });
            displayResults(results);
        }, 100);
    });
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', init);
