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
    const supply = getKitSupply();
    return {
        basic: { exp: 200, supply: supply.basic, name: '초급' },
        medium: { exp: 500, supply: supply.medium, name: '중급' },
        high: { exp: 1000, supply: supply.high, name: '상급' }
    };
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
    if (level < 5) return { start: 0, end: 5, targetLevel: 5 };
    if (level < 10) return { start: 5, end: 10, targetLevel: 10 };
    return { start: 10, end: 15, targetLevel: 15 };
}

/**
 * 단일 레벨 강화 시뮬레이션 (level → level+1, 대성공 시 구간 끝으로)
 * 조합: 상급 h개 + 중급 m개 + 나머지 초급
 * 반환: { days, basicUsed, mediumUsed, highUsed, jumped, jumpTo }
 */
function simulateLevelOnce(level, highCount, mediumCount, kitInfo) {
    let currentExp = 0;
    let basicUsed = 0;
    let mediumUsed = 0;
    let highUsed = 0;
    
    const section = getLevelSection(level);
    
    while (currentExp < REQUIRED_EXP) {
        // 1. 상급 키트 사용
        for (let i = 0; i < highCount && currentExp < REQUIRED_EXP; i++) {
            highUsed++;
            
            if (Math.random() < SR_SUCCESS_RATES[level].high / 100) {
                const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
                return { days, basicUsed, mediumUsed, highUsed, jumped: true, jumpTo: section.targetLevel };
            }
            currentExp += kitInfo.high.exp;
        }
        
        if (currentExp >= REQUIRED_EXP) break;
        
        // 2. 중급 키트 사용
        for (let i = 0; i < mediumCount && currentExp < REQUIRED_EXP; i++) {
            mediumUsed++;
            
            if (Math.random() < SR_SUCCESS_RATES[level].medium / 100) {
                const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
                return { days, basicUsed, mediumUsed, highUsed, jumped: true, jumpTo: section.targetLevel };
            }
            currentExp += kitInfo.medium.exp;
        }
        
        if (currentExp >= REQUIRED_EXP) break;
        
        // 3. 초급 키트로 채움
        while (currentExp < REQUIRED_EXP) {
            basicUsed++;
            
            if (Math.random() < SR_SUCCESS_RATES[level].basic / 100) {
                const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
                return { days, basicUsed, mediumUsed, highUsed, jumped: true, jumpTo: section.targetLevel };
            }
            currentExp += kitInfo.basic.exp;
        }
    }
    
    const days = calculateDays(basicUsed, mediumUsed, highUsed, kitInfo);
    return { days, basicUsed, mediumUsed, highUsed, jumped: false, jumpTo: level + 1 };
}

/**
 * 단일 레벨의 평균 일수 계산 (특정 조합으로)
 */
function simulateLevelAverage(level, highCount, mediumCount, simCount = SIMULATION_COUNT) {
    const kitInfo = getKitInfo();
    let daysSum = 0;
    let basicSum = 0, mediumSum = 0, highSum = 0;
    let jumpCount = 0;
    
    for (let i = 0; i < simCount; i++) {
        const result = simulateLevelOnce(level, highCount, mediumCount, kitInfo);
        daysSum += result.days;
        basicSum += result.basicUsed;
        mediumSum += result.mediumUsed;
        highSum += result.highUsed;
        if (result.jumped) jumpCount++;
    }
    
    return {
        days: daysSum / simCount,
        basicUsed: basicSum / simCount,
        mediumUsed: mediumSum / simCount,
        highUsed: highSum / simCount,
        jumpRate: jumpCount / simCount
    };
}

/**
 * 단일 레벨에서 모든 조합 생성 (supply=0인 키트 사용 조합 제외)
 */
function generateAllCombinations(supply) {
    const combinations = [];
    
    const highColor = '#fbbf24';  // 노랑
    const medColor = '#a855f7';   // 보라
    const basicColor = '#3b82f6'; // 파랑
    
    // 조합 생성: 상급 0~3개, 중급 0~6개 (3000exp 초과 조합 제외)
    for (let h = 0; h <= 3; h++) {
        for (let m = 0; m <= 6; m++) {
            // supply=0인 키트 사용 조합 제외
            if (supply.high === 0 && h > 0) continue;
            if (supply.medium === 0 && m > 0) continue;
            
            const expFromHighMedium = h * 1000 + m * 500;
            
            // 3000exp 초과하는 조합은 스킵
            if (expFromHighMedium > 3000) continue;
            
            const needsBasic = expFromHighMedium < 3000;
            
            // supply.basic=0인데 초급이 필요한 조합은 제외
            if (supply.basic === 0 && needsBasic) continue;
            
            let name = '';
            
            // 조합명 생성
            if (h === 0 && m === 0) {
                name = `<span style="color:${basicColor}">파랑</span>만`;
            } else if (needsBasic) {
                // 파랑이 필요한 경우
                if (h > 0 && m > 0) {
                    name = `<span style="color:${highColor}">노랑 ${h}회</span>, <span style="color:${medColor}">보라 ${m}회</span>, 나머지 <span style="color:${basicColor}">파랑</span>`;
                } else if (h > 0) {
                    name = `<span style="color:${highColor}">노랑 ${h}회</span>, 나머지 <span style="color:${basicColor}">파랑</span>`;
                } else {
                    name = `<span style="color:${medColor}">보라 ${m}회</span>, 나머지 <span style="color:${basicColor}">파랑</span>`;
                }
            } else {
                // 파랑이 필요 없는 경우 (정확히 3000exp)
                if (h > 0 && m > 0) {
                    name = `<span style="color:${highColor}">노랑 ${h}회</span>, <span style="color:${medColor}">보라 ${m}회</span>`;
                } else if (h > 0) {
                    name = `<span style="color:${highColor}">노랑 ${h}회</span>`;
                } else {
                    name = `<span style="color:${medColor}">보라 ${m}회</span>`;
                }
            }
            combinations.push({ high: h, medium: m, name });
        }
    }
    
    return combinations;
}

/**
 * 전체 시뮬레이션: 시작 레벨 → 15까지
 * 각 레벨별로 주어진 조합 전략 사용
 * levelStrategies: { 0: {h:0, m:1}, 1: {h:0, m:1}, ... }
 */
function simulateFullPathOnce(startLevel, levelStrategies, kitInfo) {
    let currentLevel = startLevel;
    let totalBasic = 0, totalMedium = 0, totalHigh = 0;
    const levelStats = {};
    
    while (currentLevel < 15) {
        const strategy = levelStrategies[currentLevel] || { h: 0, m: 0 };
        const result = simulateLevelOnce(currentLevel, strategy.h, strategy.m, kitInfo);
        
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
        
        currentLevel = result.jumpTo; // 대성공 시 점프, 아니면 +1
    }
    
    // 전체 일수 계산 (총 사용량 기준)
    const totalDays = calculateDays(totalBasic, totalMedium, totalHigh, kitInfo);
    
    return { totalDays, totalBasic, totalMedium, totalHigh, levelStats };
}

/**
 * 전체 경로 평균 일수 계산 (분포 데이터 포함)
 */
function simulateFullPathAverage(startLevel, levelStrategies, simCount = SIMULATION_COUNT) {
    const kitInfo = getKitInfo();
    let daysSum = 0;
    let basicSum = 0, mediumSum = 0, highSum = 0;
    const levelStatsAgg = {};
    
    // 분포 데이터 수집용 배열
    const distributions = {
        basic: [],
        medium: [],
        high: [],
        days: []
    };
    
    // 레벨 통계 초기화
    for (let l = startLevel; l < 15; l++) {
        levelStatsAgg[l] = { daysSum: 0, countSum: 0, basicSum: 0, mediumSum: 0, highSum: 0, visitCount: 0 };
    }
    
    for (let i = 0; i < simCount; i++) {
        const result = simulateFullPathOnce(startLevel, levelStrategies, kitInfo);
        daysSum += result.totalDays;
        basicSum += result.totalBasic;
        mediumSum += result.totalMedium;
        highSum += result.totalHigh;
        
        // 분포 데이터 저장
        distributions.basic.push(result.totalBasic);
        distributions.medium.push(result.totalMedium);
        distributions.high.push(result.totalHigh);
        distributions.days.push(result.totalDays);
        
        // 각 레벨 통계 누적
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
    
    // 평균 계산
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

/**
 * 레벨별 평균 사용량 계산 (캐시용)
 */
function computeLevelUsage(level, highCount, mediumCount, simCount = 5000) {
    const kitInfo = getKitInfo();
    let basicSum = 0, mediumSum = 0, highSum = 0;
    let jumpCount = 0;
    
    for (let i = 0; i < simCount; i++) {
        const result = simulateLevelOnce(level, highCount, mediumCount, kitInfo);
        basicSum += result.basicUsed;
        mediumSum += result.mediumUsed;
        highSum += result.highUsed;
        if (result.jumped) jumpCount++;
    }
    
    return {
        basic: basicSum / simCount,
        medium: mediumSum / simCount,
        high: highSum / simCount,
        jumpRate: jumpCount / simCount
    };
}

/**
 * 전체 경로의 실제 평균 사용량 계산 (대성공 스킵 반영)
 */
function computeFullPathUsage(startLevel, strategies, simCount = 10000) {
    const kitInfo = getKitInfo();
    let basicSum = 0, mediumSum = 0, highSum = 0;
    
    for (let i = 0; i < simCount; i++) {
        let currentLevel = startLevel;
        let basic = 0, medium = 0, high = 0;
        
        while (currentLevel < 15) {
            const strat = strategies[currentLevel];
            if (!strat) break;
            
            const result = simulateLevelOnce(currentLevel, strat.h, strat.m, kitInfo);
            basic += result.basicUsed;
            medium += result.mediumUsed;
            high += result.highUsed;
            currentLevel = result.jumpTo;
        }
        
        basicSum += basic;
        mediumSum += medium;
        highSum += high;
    }
    
    return {
        basic: basicSum / simCount,
        medium: mediumSum / simCount,
        high: highSum / simCount
    };
}

/**
 * 빔 서치를 이용한 레벨별 최적 조합 탐색
 * 각 레벨에서 다른 조합을 사용할 수 있음
 */
function findOptimalPathWithBeamSearch(startLevel) {
    const supply = getKitSupply();
    const tolerance = getTolerancePercent();
    const combinations = generateAllCombinations(supply);
    const kitInfo = getKitInfo();
    
    const BEAM_SIZE = 100; // 유지할 경로 수
    const VERIFY_TOP = 20; // 검증할 상위 경로 수
    const levels = [];
    for (let l = startLevel; l < 15; l++) levels.push(l);
    
    console.log('레벨별 사용량 캐시 계산 중...');
    
    // 각 레벨 × 조합의 평균 사용량 미리 계산
    const levelUsageCache = {};
    for (const level of levels) {
        levelUsageCache[level] = {};
        for (let ci = 0; ci < combinations.length; ci++) {
            const combo = combinations[ci];
            levelUsageCache[level][ci] = computeLevelUsage(level, combo.high, combo.medium, 5000);
        }
    }
    
    console.log('빔 서치 시작...');
    
    // 빔 서치: 각 경로는 {strategies, totalBasic, totalMedium, totalHigh}
    let beam = [{
        strategies: {},
        totalBasic: 0,
        totalMedium: 0,
        totalHigh: 0,
        visitProb: 1.0 // 이 경로까지 도달할 확률
    }];
    
    // 구간별로 처리 (대성공 시 구간 끝으로 점프)
    const sections = [
        { start: 0, end: 4 },
        { start: 5, end: 9 },
        { start: 10, end: 14 }
    ];
    
    for (const section of sections) {
        if (section.end < startLevel) continue;
        
        const sectionStart = Math.max(section.start, startLevel);
        let sectionBeam = beam.map(p => ({ ...p, sectionVisitProb: 1.0 }));
        
        for (let level = sectionStart; level <= section.end; level++) {
            const newBeam = [];
            
            for (const path of sectionBeam) {
                // 이 레벨에서 각 조합 시도
                for (let ci = 0; ci < combinations.length; ci++) {
                    const combo = combinations[ci];
                    const usage = levelUsageCache[level][ci];
                    
                    // 방문 확률을 곱해서 예상 사용량 계산
                    const effectiveUsage = {
                        basic: usage.basic * path.sectionVisitProb,
                        medium: usage.medium * path.sectionVisitProb,
                        high: usage.high * path.sectionVisitProb
                    };
                    
                    const newTotal = {
                        basic: path.totalBasic + effectiveUsage.basic,
                        medium: path.totalMedium + effectiveUsage.medium,
                        high: path.totalHigh + effectiveUsage.high
                    };
                    
                    // 대성공하면 구간 끝으로 점프 → 이후 레벨 방문 안 함
                    const newVisitProb = path.sectionVisitProb * (1 - usage.jumpRate);
                    
                    const newStrategies = { ...path.strategies, [level]: { h: combo.high, m: combo.medium, ci } };
                    
                    newBeam.push({
                        strategies: newStrategies,
                        totalBasic: newTotal.basic,
                        totalMedium: newTotal.medium,
                        totalHigh: newTotal.high,
                        sectionVisitProb: newVisitProb
                    });
                }
            }
            
            // 비율 오차 + 총 사용량 기준으로 정렬 후 상위 BEAM_SIZE개만 유지
            newBeam.forEach(p => {
                p.ratioError = calculateRatioError(p.totalBasic, p.totalMedium, p.totalHigh, supply);
                p.totalUsage = p.totalBasic + p.totalMedium + p.totalHigh;
                p.cost = calculateDays(p.totalBasic, p.totalMedium, p.totalHigh, kitInfo);
            });
            
            // 정규화를 위한 min/max 계산
            const costs = newBeam.map(p => p.cost).filter(c => isFinite(c));
            const errors = newBeam.map(p => p.ratioError);
            const minCost = Math.min(...costs);
            const maxCost = Math.max(...costs);
            const minError = Math.min(...errors);
            const maxError = Math.max(...errors);
            const costRange = maxCost - minCost || 1;
            const errorRange = maxError - minError || 1;
            
            newBeam.sort((a, b) => {
                const aInTol = a.ratioError <= tolerance;
                const bInTol = b.ratioError <= tolerance;
                if (aInTol && !bInTol) return -1;
                if (!aInTol && bInTol) return 1;
                if (aInTol && bInTol) return a.cost - b.cost; // 비율 가중 cost 최소화
                // 둘 다 미충족: ratioError 70%, cost 30% 가중 비교 (정규화)
                const normCostA = (a.cost - minCost) / costRange;
                const normCostB = (b.cost - minCost) / costRange;
                const normErrorA = (a.ratioError - minError) / errorRange;
                const normErrorB = (b.ratioError - minError) / errorRange;
                const scoreA = normCostA * 0.3 + normErrorA * 0.7;
                const scoreB = normCostB * 0.3 + normErrorB * 0.7;
                return scoreA - scoreB;
            });
            
            sectionBeam = newBeam.slice(0, BEAM_SIZE);
        }
        
        beam = sectionBeam;
        console.log(`구간 ${section.start}-${section.end} 완료, 최소 오차: ${beam[0]?.ratioError.toFixed(2)}%p`);
    }
    
    console.log('상위 후보 실제 시뮬레이션 검증 중...');
    
    // 상위 후보들에 대해 실제 시뮬레이션으로 검증
    const verifiedCandidates = [];
    for (let i = 0; i < Math.min(VERIFY_TOP, beam.length); i++) {
        const candidate = beam[i];
        const simStrategies = {};
        for (const level of levels) {
            const strat = candidate.strategies[level];
            if (strat) simStrategies[level] = { h: strat.h, m: strat.m };
        }
        
        // 실제 시뮬레이션으로 평균 사용량 계산
        const actualUsage = computeFullPathUsage(startLevel, simStrategies, 30000);
        const actualError = calculateRatioError(actualUsage.basic, actualUsage.medium, actualUsage.high, supply);
        const actualCost = calculateDays(actualUsage.basic, actualUsage.medium, actualUsage.high, kitInfo);
        
        verifiedCandidates.push({
            ...candidate,
            actualBasic: actualUsage.basic,
            actualMedium: actualUsage.medium,
            actualHigh: actualUsage.high,
            actualTotal: actualUsage.basic + actualUsage.medium + actualUsage.high,
            actualError,
            actualCost,
            simStrategies
        });
    }
    
    // 실제 결과 기준으로 재정렬 (비율 오차 범위 내에서 cost 최소)
    // 정규화를 위한 min/max 계산
    const vCosts = verifiedCandidates.map(p => p.actualCost).filter(c => isFinite(c));
    const vErrors = verifiedCandidates.map(p => p.actualError);
    const vMinCost = Math.min(...vCosts);
    const vMaxCost = Math.max(...vCosts);
    const vMinError = Math.min(...vErrors);
    const vMaxError = Math.max(...vErrors);
    const vCostRange = vMaxCost - vMinCost || 1;
    const vErrorRange = vMaxError - vMinError || 1;
    
    verifiedCandidates.sort((a, b) => {
        const aInTol = a.actualError <= tolerance;
        const bInTol = b.actualError <= tolerance;
        if (aInTol && !bInTol) return -1;
        if (!aInTol && bInTol) return 1;
        if (aInTol && bInTol) return a.actualCost - b.actualCost; // cost 최소화
        // 둘 다 미충족: ratioError 70%, cost 30% 가중 비교 (정규화)
        const normCostA = (a.actualCost - vMinCost) / vCostRange;
        const normCostB = (b.actualCost - vMinCost) / vCostRange;
        const normErrorA = (a.actualError - vMinError) / vErrorRange;
        const normErrorB = (b.actualError - vMinError) / vErrorRange;
        const scoreA = normCostA * 0.3 + normErrorA * 0.7;
        const scoreB = normCostB * 0.3 + normErrorB * 0.7;
        return scoreA - scoreB;
    });
    
    const bestPath = verifiedCandidates[0];
    console.log(`최적 경로 선택: 오차 ${bestPath.actualError.toFixed(2)}%p, 총사용량 ${bestPath.actualTotal.toFixed(1)}, cost ${bestPath.actualCost.toFixed(2)}`);
    
    // 최적 전략 구성
    const optimalStrategies = bestPath.simStrategies;
    
    // 레벨별 결과 생성
    const levelResults = {};
    for (const level of levels) {
        const strat = bestPath.strategies[level];
        if (!strat) continue;
        const combo = combinations[strat.ci];
        const result = simulateLevelAverage(level, combo.high, combo.medium, 10000);
        levelResults[level] = [{
            ...combo,
            ...result,
            expectedToEnd: result.days
        }];
    }
    
    // 전체 경로 시뮬레이션 (분포 데이터용)
    const fullPathResult = simulateFullPathAverage(startLevel, optimalStrategies, 100000);
    fullPathResult.ratioError = bestPath.actualError;
    fullPathResult.ratioInfo = {
        target: supply,
        actual: {
            basic: bestPath.actualBasic,
            medium: bestPath.actualMedium,
            high: bestPath.actualHigh
        }
    };
    
    return {
        startLevel,
        levelResults,
        optimalStrategies,
        fullPathResult,
        validPathCount: verifiedCandidates.filter(p => p.actualError <= tolerance).length,
        bestPath: {
            ...bestPath,
            totalBasic: bestPath.actualBasic,
            totalMedium: bestPath.actualMedium,
            totalHigh: bestPath.actualHigh,
            error: bestPath.actualError,
            cost: bestPath.actualCost
        }
    };
}

/**
 * 메인: 시작 레벨부터 15까지 최적 경로 찾기 (레벨별 빔 서치)
 */
function findOptimalPath(startLevel) {
    return findOptimalPathWithBeamSearch(startLevel);
}

/**
 * 상위% 분포 데이터 생성 (오름차순 정렬)
 */
function createPercentileData(arr) {
    // 오름차순 정렬 (상위 0% = 최소값/운좋음, 상위 100% = 최대값/운나쁨)
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
function drawPercentileChart(canvasId, data, color, label) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 25, right: 20, bottom: 35, left: 50 };
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // 오름차순 정렬된 데이터: data[0]=최솟값(운좋음), data[100]=최댓값(운나쁨)
    const minVal = data[0].value;
    const maxVal = data[data.length - 1].value;
    const range = maxVal - minVal || 1;
    
    // 캔버스에 데이터 저장 (호버 이벤트용)
    canvas._chartData = { data, color, label, minVal, maxVal, range, padding, chartWidth, chartHeight };
    
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
        
        // 영역 채우기
        ctx.fillStyle = color + '40';
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        data.forEach((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;
            ctx.lineTo(x, y);
        });
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.closePath();
        ctx.fill();
        
        // 라인 그리기
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        data.forEach((d, i) => {
            const x = padding.left + (i / (data.length - 1)) * chartWidth;
            const y = padding.top + chartHeight - ((d.value - minVal) / range) * chartHeight;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });
        ctx.stroke();
        
        // 25%, 50%, 75% 표시
        const drawMarker = (pct, markerColor) => {
            const x = padding.left + (pct / 100) * chartWidth;
            const val = data[pct].value;
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
        if (pctIndex < 0 || pctIndex >= data.length) return;
        
        const d = data[pctIndex];
        const x = padding.left + (pctIndex / (data.length - 1)) * chartWidth;
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
    canvas.onmousemove = function(e) {
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
    
    canvas.onmouseleave = function() {
        drawBase();
    };
}

/**
 * 분포 그래프 HTML 생성 및 그리기
 */
function createDistributionHTML(distributions) {
    // 전역 변수에 데이터 저장 (그래프 그릴 때 사용) - 10배 적용
    window._currentDistData = {
        '초급': distributions.basic.map(x => x * 10),
        '중급': distributions.medium.map(x => x * 10),
        '상급': distributions.high.map(x => x * 10)
    };
    
    return `
        <div class="distribution-section">
            <h4 style="color: #9ca3af; margin-bottom: 15px;">키트 사용량 분포 (10만회 시뮬레이션)</h4>
            <div class="dist-legend" style="margin-bottom: 10px;">
                <span style="color: #22c55e;">● 상위 25%</span>
                <span style="color: #fff;">● 상위 50% (중앙값)</span>
                <span style="color: #f59e0b;">● 상위 75%</span>
            </div>
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
function drawAllHistograms(distributions) {
    setTimeout(() => {
        // 10배 적용된 데이터 사용
        const basicData = createPercentileData(distributions.basic.map(x => x * 10));
        const mediumData = createPercentileData(distributions.medium.map(x => x * 10));
        const highData = createPercentileData(distributions.high.map(x => x * 10));
        
        drawPercentileChart('histBasic', basicData, '#6b7280', '초급');
        drawPercentileChart('histMedium', mediumData, '#6b7280', '중급');
        drawPercentileChart('histHigh', highData, '#6b7280', '상급');
    }, 50);
}

/**
 * 결과 화면 표시
 */
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    const summaryBox = document.getElementById('summaryBox');
    const topResultsDiv = document.getElementById('topResults');
    
    resultsSection.style.display = 'block';
    
    const { startLevel, levelResults, fullPathResult, validPathCount } = results;
    
    // 실제 사용 비율 계산
    const totalUsed = fullPathResult.basicUsed + fullPathResult.mediumUsed + fullPathResult.highUsed;
    const actualRatio = {
        basic: ((fullPathResult.basicUsed / totalUsed) * 100).toFixed(1),
        medium: ((fullPathResult.mediumUsed / totalUsed) * 100).toFixed(1),
        high: ((fullPathResult.highUsed / totalUsed) * 100).toFixed(1)
    };
    
    // 목표 비율
    const supply = getKitSupply();
    const supplyTotal = supply.basic + supply.medium + supply.high;
    const targetRatio = {
        basic: ((supply.basic / supplyTotal) * 100).toFixed(1),
        medium: ((supply.medium / supplyTotal) * 100).toFixed(1),
        high: ((supply.high / supplyTotal) * 100).toFixed(1)
    };
    
    // 요약 박스
    summaryBox.innerHTML = `
        <h3>전체 요약: ${startLevel} → 15 레벨</h3>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="value">${(fullPathResult.basicUsed * 10).toFixed(0)}</div>
                <div class="label">초급 키트</div>
            </div>
            <div class="summary-item">
                <div class="value">${(fullPathResult.mediumUsed * 10).toFixed(0)}</div>
                <div class="label">중급 키트</div>
            </div>
            <div class="summary-item">
                <div class="value">${(fullPathResult.highUsed * 10).toFixed(0)}</div>
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
    
    // 각 구간별 레벨 결과
    topResultsDiv.innerHTML = '';
    
    const sections = [
        { name: '1구간 (5단계 목표)', start: 0, end: 5 },
        { name: '2구간 (10단계 목표)', start: 5, end: 10 },
        { name: '3구간 (15단계 목표)', start: 10, end: 15 }
    ];
    
    sections.forEach(section => {
        if (startLevel >= section.end) return; // 이 구간 스킵
        
        const sectionStart = Math.max(startLevel, section.start);
        
        let sectionHTML = `<div class="section-divider">${section.name}</div>`;
        
        for (let level = sectionStart; level < section.end; level++) {
            const combos = levelResults[level];
            if (!combos) continue;
            
            // 대성공 확률이 100%이고 해당 키트를 사용한 경우에만 조합명 override
            const highColor = '#fbbf24';
            const medColor = '#a855f7';
            const basicColor = '#3b82f6';
            let displayName = combos[0].name;
            
            if (SR_SUCCESS_RATES[level].high >= 100 && combos[0].high >= 1) {
                displayName = `<span style="color:${highColor}">노랑1</span>`;
            } else if (SR_SUCCESS_RATES[level].medium >= 100 && combos[0].high === 0 && combos[0].medium >= 1) {
                displayName = `<span style="color:${medColor}">보라1</span>`;
            } else if (SR_SUCCESS_RATES[level].basic >= 100 && combos[0].high === 0 && combos[0].medium === 0) {
                displayName = `<span style="color:${basicColor}">파랑1</span>`;
            }
            
            sectionHTML += `
                <div class="level-section" style="margin-bottom: 20px;">
                    <h3 style="color: #9ca3af; margin-bottom: 10px;">
                        <span>${level} → ${level + 1} 단계</span>
                    </h3>
                    <div style="font-size: 0.85rem; color: #aaa; margin-bottom: 8px;">
                        확률: 초급 ${SR_SUCCESS_RATES[level].basic}% · 
                        중급 ${SR_SUCCESS_RATES[level].medium}% · 
                        상급 ${SR_SUCCESS_RATES[level].high}%
                    </div>
                    <div class="top-combos">
                        <div class="result-card rank-1" style="margin-bottom: 8px; border-width: 2px;">
                            <div class="result-header">
                                <span class="rank-badge">최적</span>
                            </div>
                            <div class="combo-name" style="font-size: 1.1rem; font-weight: bold; color: #e5e7eb; margin: 10px 0; padding: 8px 12px; background: rgba(255,255,255,0.08); border-radius: 6px;">
                                ${displayName}
                            </div>
                            <div style="font-size: 0.85rem; color: #888; margin-bottom: 8px;">평균 사용량 (이 단계만)</div>
                            <div class="result-details">
                                <div class="detail-item">
                                    <span class="detail-label">초급</span>
                                    <span class="detail-value">${(combos[0].basicUsed * 10).toFixed(0)}개</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">중급</span>
                                    <span class="detail-value">${(combos[0].mediumUsed * 10).toFixed(0)}개</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">상급</span>
                                    <span class="detail-value">${(combos[0].highUsed * 10).toFixed(0)}개</span>
                                </div>
                                <div class="detail-item">
                                    <span class="detail-label">대성공 확률</span>
                                    <span class="detail-value">${(combos[0].jumpRate * 100).toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        topResultsDiv.innerHTML += sectionHTML;
    });
    
    // 스크롤
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

/**
 * 초기화
 */
function init() {
    // 최적 경로 계산 버튼
    document.getElementById('calculateBtn').addEventListener('click', () => {
        // 입력 검증
        if (!validateKitSupply()) {
            return;
        }
        
        const fromLevel = parseInt(document.getElementById('fromLevel').value);
        
        // 로딩 표시
        const resultsSection = document.getElementById('resultsSection');
        const topResultsDiv = document.getElementById('topResults');
        const summaryBox = document.getElementById('summaryBox');
        
        resultsSection.style.display = 'block';
        summaryBox.innerHTML = '<div class="info-message">시뮬레이션 중... 잠시만 기다려주세요.</div>';
        topResultsDiv.innerHTML = '';
        
        // 비동기로 계산 (UI 블로킹 방지)
        setTimeout(() => {
            const results = findOptimalPath(fromLevel);
            displayResults(results);
        }, 100);
    });
}

// DOM 로드 후 초기화
document.addEventListener('DOMContentLoaded', init);

