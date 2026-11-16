// ==================== نظام المؤثرات الصوتية التفاعلية (Web Audio API) ====================
let isMuted = false;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function toggleMute() {
    isMuted = !isMuted;
    const btn = document.getElementById('sound-btn');
    btn.textContent = isMuted ? '🔇' : '🔊';
    if (!isMuted) playSound('pop');
}

function playSound(type) {
    if (isMuted) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;

    if (type === 'pop') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(780, now + 0.09);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
    } else if (type === 'success') {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now + idx * 0.09);
            gain.gain.setValueAtTime(0.2, now + idx * 0.09);
            gain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now + idx * 0.09);
            osc.stop(now + idx * 0.09 + 0.25);
        });
    } else if (type === 'buzz' || type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.28);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    } else if (type === 'motor') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.linearRampToValueAtTime(480, now + 0.25);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.28);
    }
}

// ==================== حالة اللعبة العامة والنقاط ====================
let totalScore = 0;

function addScore(points) {
    totalScore += points;
    const scoreEl = document.getElementById('score-val');
    scoreEl.textContent = totalScore;
    scoreEl.parentElement.style.transform = 'scale(1.18)';
    setTimeout(() => {
        scoreEl.parentElement.style.transform = 'scale(1)';
    }, 250);
}

function setMascotMessage(face, title, text) {
    document.getElementById('mascot-face').textContent = face;
    document.getElementById('mascot-title').textContent = title;
    document.getElementById('mascot-text').textContent = text;
}

function switchSection(sectionName) {
    playSound('pop');
    if (sectionName !== 'guide' && typeof stopTutorialTimer === 'function') {
        stopTutorialTimer();
    }
    document.querySelectorAll('.game-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(`section-${sectionName}`).classList.add('active');
    document.getElementById(`tab-${sectionName}`).classList.add('active');

    if (sectionName === 'guide') {
        setMascotMessage('🎬', 'فيديو الشرح والكتالوج المصور!', 'اضغط على (▶️ تشغيل الفيديو بالصوت) لتشاهد مثالاً عملياً خطوة بخطوة، أو تصفح المانوال بالأسفل!');
        renderVideoStep(currentVideoStep);
    } else if (sectionName === 'kitchen') {
        setMascotMessage('🧑‍🍳', 'أهلاً بك في مطبخ الصلصال العلمي!', 'جرب خلط الماء والدقيق مع الملح مرة، ومع السكر مرة أخرى، واكتشف بنفسك أيهما يضيء المصباح!');
    } else if (sectionName === 'workshop') {
        setMascotMessage('🔌', 'ورشة الأشكال المضيئة (ديسكفري)!', 'اختر الشكل الذي تحبه، كوّن أجزاء الصلصال وضع العازل بينهما، ثم وصّل البطارية والليد بالطريقة الصحيحة!');
        renderShape();
    } else if (sectionName === 'quiz') {
        setMascotMessage('🏆', 'تحدي العلماء الصغار!', 'هيا نختبر معلوماتك العلمية التي تعلمتها في ورشة الصلصال الكهربي اليوم!');
        loadQuizQuestion();
    }
}

// ==================== القسم الأول: مطبخ الصلصال (الملح والسكر والماء) ====================
let currentKitchenGoal = 'conductive';
let bowlIngredients = new Set();
let kitchenGoalsDone = { conductive: false, insulator: false };

const ingredientNames = {
    water: '💧 ماء',
    flour: '🌾 دقيق',
    salt: '🧂 ملح',
    sugar: '🍬 سكر',
    foam: '🧽 قطعة فوم/ورق'
};

function setKitchenGoal(goal) {
    playSound('pop');
    currentKitchenGoal = goal;
    document.getElementById('goal-conductive').classList.toggle('active', goal === 'conductive');
    document.getElementById('goal-insulator').classList.toggle('active', goal === 'insulator');
    clearBowl();

    if (goal === 'conductive') {
        setMascotMessage('⚡', 'مهمة تحضير الصلصال الموصل للكهرباء!', 'نحتاج إلى (ماء + دقيق + ملح طعام 🧂) لأن الملح عندما يذوب في الماء يعطي أيونات توصل التيار الكهربائي!');
    } else {
        setMascotMessage('🛡️', 'مهمة تحضير العازل الكهربائي!', 'لكي لا يتلامس طرفا الصلصال الموصل، نصنع عجينة عازلة من (ماء + دقيق + سكر 🍬) أو نستخدم قطعة فوم أو ورق!');
    }
}

function addIngredient(ing) {
    playSound('pop');
    if (bowlIngredients.has(ing)) {
        bowlIngredients.delete(ing);
    } else {
        bowlIngredients.add(ing);
    }
    updateKitchenUI();
}

function clearBowl() {
    bowlIngredients.clear();
    updateKitchenUI();
    const bulb = document.getElementById('test-bulb-icon');
    const blob = document.getElementById('test-sample-blob');
    bulb.classList.remove('lit');
    blob.style.background = '#475569';
    blob.textContent = '؟';
    document.getElementById('tester-result-text').textContent = 'اصنع العجين أولاً لنرى هل يمر التيار الكهربائي أم لا!';
}

function updateKitchenUI() {
    ['water', 'flour', 'salt', 'sugar', 'foam'].forEach(id => {
        const card = document.getElementById(`ing-${id}`);
        if (card) card.classList.toggle('selected', bowlIngredients.has(id));
    });

    const container = document.getElementById('bowl-contents');
    if (bowlIngredients.size === 0) {
        container.innerHTML = '<span class="empty-hint">الوعاء فارغ.. أضف المكونات!</span>';
        return;
    }

    container.innerHTML = '';
    bowlIngredients.forEach(ing => {
        const pill = document.createElement('span');
        pill.className = 'ing-pill';
        pill.textContent = ingredientNames[ing];
        container.appendChild(pill);
    });
}

function testMixture() {
    const hasWater = bowlIngredients.has('water');
    const hasFlour = bowlIngredients.has('flour');
    const hasSalt = bowlIngredients.has('salt');
    const hasSugar = bowlIngredients.has('sugar');
    const hasFoam = bowlIngredients.has('foam');

    const bulb = document.getElementById('test-bulb-icon');
    const blob = document.getElementById('test-sample-blob');
    const resultText = document.getElementById('tester-result-text');

    if (bowlIngredients.size === 0) {
        playSound('error');
        resultText.textContent = '⚠️ الوعاء فارغ يا بطل! اختر المكونات من الأعلى أولاً.';
        return;
    }

    // فحص وصفة الصلصال الموصل
    if (currentKitchenGoal === 'conductive') {
        if (hasWater && hasFlour && hasSalt && !hasSugar && !hasFoam) {
            playSound('success');
            bulb.classList.add('lit');
            blob.style.background = '#ef4444';
            blob.textContent = '⚡🧂';
            resultText.innerHTML = '🎉 <strong>أحسنت يا عبقري!</strong> الماء + الدقيق + الملح يصنع <strong>صلصالاً موصلاً للكهرباء</strong>، وها هو المصباح يضيء بقوة!';
            setMascotMessage('🤩', 'تفاعل ممتاز! الملح والماء أبطال التوصيل!', 'ذوبان الملح في الماء داخل العجين سمح للشحنات الكهربائية بالمرور وإضاءة الليد! جرب الآن تحضير العازل أو انتقل لورشة الأشكال.');
            if (!kitchenGoalsDone.conductive) {
                kitchenGoalsDone.conductive = true;
                document.getElementById('done-conductive').classList.add('done');
                addScore(30);
            }
        } else if (hasSugar && !hasSalt) {
            playSound('error');
            bulb.classList.remove('lit');
            blob.style.background = '#facc15';
            blob.textContent = '🍬🛡️';
            resultText.innerHTML = '💡 وضعت <strong>السكر</strong> بدلاً من الملح! عجينة السكر <strong>عازلة للكهرباء</strong> ولا تضيء المصباح. استبدل السكر بالملح!';
        } else if (hasSalt && (!hasWater || !hasFlour)) {
            playSound('error');
            bulb.classList.remove('lit');
            blob.style.background = '#94a3b8';
            blob.textContent = '🧂';
            resultText.innerHTML = '🔍 الملح وحده لا يكفي لتكوين عجينة! نحتاج إلى <strong>الماء 💧</strong> لإذابة الملح و<strong>الدقيق 🌾</strong> لتشكيل الصلصال.';
        } else {
            playSound('error');
            bulb.classList.remove('lit');
            blob.style.background = '#64748b';
            blob.textContent = '❌';
            resultText.innerHTML = '🤔 هذه الخلطة غير دقيقة! للصلصال الموصل نحتاج فقط: (ماء + دقيق + ملح طعام) بدون سكر أو فوم.';
        }
    } else {
        // فحص وصفة العازل الكهربائي
        const isSugarDough = hasWater && hasFlour && hasSugar && !hasSalt;
        const isFoamOnly = hasFoam && !hasSalt;

        if (isSugarDough || isFoamOnly) {
            playSound('success');
            bulb.classList.remove('lit');
            blob.style.background = '#e2e8f0';
            blob.style.color = '#0f172a';
            blob.textContent = '🛡️✔️';
            resultText.innerHTML = '🎉 <strong>ممتاز جداً!</strong> المصباح لم يضئ لأن ' + (isFoamOnly ? 'الفوم/الورق' : 'عجينة السكر (ماء + دقيق + سكر)') + ' مادة <strong>عازلة تمنع مرور الكهرباء</strong> وتحمي الدائرة من التلامس!';
            setMascotMessage('👏', 'الآن لديك الصلصال الموصل والعازل معاً!', 'هيا اضغط على زر (2. ورشة الأشكال المضيئة) في الأعلى لنصنع الحلزون والسمكة والأخطبوط والفراشة والسيارة!');
            if (!kitchenGoalsDone.insulator) {
                kitchenGoalsDone.insulator = true;
                document.getElementById('done-insulator').classList.add('done');
                addScore(30);
            }
        } else if (hasSalt) {
            playSound('error');
            bulb.classList.add('lit');
            blob.style.background = '#ef4444';
            blob.textContent = '⚡🧂';
            resultText.innerHTML = '⚠️ لقد أضفت <strong>الملح</strong>! الملح يجعل العجينة موصلة للكهرباء وليست عازلة! في العازل نستخدم <strong>السكر</strong> أو <strong>الفوم</strong> بدون ملح.';
        } else {
            playSound('error');
            bulb.classList.remove('lit');
            resultText.innerHTML = '🤔 لصناعة العازل اختر إما (ماء + دقيق + سكر) أو اختر (قطعة فوم / ورق) بدون ملح!';
        }
    }
}

// ==================== القسم الثاني: ورشة الأشكال المضيئة (محاكاة الأنشطة الـ 6 في الصور) ====================
let currentShapeKey = 'balls';
let activeTool = 'conductive';

// تعريف الأشكال الـ 6 المطابقة لأوراق الورشة العلمية
const shapesCatalog = {
    balls: {
        title: '1. تجربة الكرتين والليد (الأساسيات)',
        stepsText: 'اصنع كرتين من الصلصال الكهربي، وضع بينهما عازلاً (فوم أو عجين سكر)، ثم وصّل الموجب (الأحمر) والسالب (الأسود) واغرز الليد!',
        partAName: 'الكرة البرتقالية (+)',
        partBName: 'الكرة البنفسجية (-)',
        colorA: '#f97316',
        colorB: '#7c3aed',
        wirePosTarget: { x: 350, y: 270 },
        wireNegTarget: { x: 560, y: 270 },
        ledPosLeg: { x: 390, y: 205 },
        ledNegLeg: { x: 520, y: 205 },
        ledHead: { x: 455, y: 120 },
        buzzerPos: { x: 455, y: 345 }
    },
    snail: {
        title: '2. الحلزون المضيء 🐌',
        stepsText: 'في الحلزون: الصدفة الدائرية من الصلصال الكهربي (نوصلها بالموجب الأحمر)، وجسم الحلزون مع قرونه من الصلصال الكهربي (بالسالب الأسود)، وبين الصدفة والجسم شريط عازل!',
        partAName: 'صدفة الحلزون الحلزونية (+)',
        partBName: 'جسم وقرون الحلزون (-)',
        colorA: '#2563eb',
        colorB: '#facc15',
        wirePosTarget: { x: 365, y: 210 },
        wireNegTarget: { x: 330, y: 345 },
        ledPosLeg: { x: 475, y: 185 },
        ledNegLeg: { x: 585, y: 170 },
        ledHead: { x: 560, y: 105 },
        buzzerPos: { x: 430, y: 390 }
    },
    fish: {
        title: '3. السمكة المنيرة 🐠',
        stepsText: 'اصنع جسم السمكة وزعانفها من الصلصال الكهربي (+)، وافصل الوجه تماماً عن الجسم بقوس عازل (ورق/فوم/بلاستيك)، ثم أوصل الوجه بالسالب (-) وضع الليد في عين السمكة!',
        partAName: 'جسم السمكة وزعانفها (+)',
        partBName: 'وجه السمكة الأمامي (-)',
        colorA: '#eab308',
        colorB: '#facc15',
        wirePosTarget: { x: 360, y: 265 },
        wireNegTarget: { x: 615, y: 265 },
        ledPosLeg: { x: 500, y: 210 },
        ledNegLeg: { x: 605, y: 210 },
        ledHead: { x: 565, y: 155 },
        buzzerPos: { x: 420, y: 380 }
    },
    octopus: {
        title: '4. الأخطبوط العجيب ذو العيون المضيئة 🐙',
        stepsText: 'في الأخطبوط: نقسم الرأس مع الأرجل إلى نصفين/جزأين يفصل بينهما شريط عازل من الفوم أو عجينة السكر، ثم نضع الليد بين الطرف الموجب (+) والطرف السالب (-) لتضيء عيون الأخطبوط!',
        partAName: 'أعلى الرأس الموصل (+)',
        partBName: 'أسفل الرأس والأرجل الثمانية (-)',
        colorA: '#22c55e',
        colorB: '#16a34a',
        wirePosTarget: { x: 465, y: 155 },
        wireNegTarget: { x: 375, y: 335 },
        ledPosLeg: { x: 430, y: 165 },
        ledNegLeg: { x: 430, y: 255 },
        ledHead: { x: 465, y: 195 },
        buzzerPos: { x: 585, y: 330 }
    },
    butterfly: {
        title: '5. الفراشة المضيئة 🦋',
        stepsText: 'جناح الفراشة الأيمن صلصال كهربي (+) والجناح الأيسر صلصال كهربي (-)، وفي المنتصف جسم الفراشة الأصفر هو العازل (عجينة سكر بدون ملح)! نغرز الليد بين الجناحين لتضيء الفراشة.',
        partAName: 'الجناح الأيمن (+)',
        partBName: 'الجناح الأيسر (-)',
        colorA: '#06b6d4',
        colorB: '#0891b2',
        wirePosTarget: { x: 335, y: 260 },
        wireNegTarget: { x: 595, y: 260 },
        ledPosLeg: { x: 410, y: 155 },
        ledNegLeg: { x: 520, y: 155 },
        ledHead: { x: 465, y: 95 },
        buzzerPos: { x: 465, y: 390 }
    },
    car: {
        title: '6. السيارة الساندوتش والمروحة 🚗',
        stepsText: 'نضع طبقة صلصال كهربي من فوق (+) وطبقة صلصال كهربي من تحت (-)، وفي المنتصف طبقة عازل مع 4 عجلات عازلة! نضع الليد الطرف الطويل في المستطيل الأعلى والقصير في الأسفل لتضيء كشافات السيارة!',
        partAName: 'المستطيل العلوي للسيارة (+)',
        partBName: 'المستطيل السفلي للسيارة (-)',
        colorA: '#14b8a6',
        colorB: '#0d9488',
        wirePosTarget: { x: 390, y: 185 },
        wireNegTarget: { x: 390, y: 300 },
        ledPosLeg: { x: 545, y: 195 },
        ledNegLeg: { x: 545, y: 295 },
        ledHead: { x: 605, y: 245 },
        buzzerPos: { x: 455, y: 115 }
    }
};

// حالة البناء لكل شكل
let shapeStates = {};

function initShapeStates() {
    Object.keys(shapesCatalog).forEach(key => {
        shapeStates[key] = {
            partA: false,
            partB: false,
            insulator: 'empty', // 'empty' | 'placed' | 'short_circuit'
            wirePos: false,
            wireNeg: false,
            led: 'none', // 'none' | 'correct' | 'reversed'
            buzzer: false,
            completedOnce: false
        };
    });
}
initShapeStates();

function selectTool(toolName) {
    playSound('pop');
    activeTool = toolName;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    const btnMap = {
        conductive: 'tool-conductive',
        insulator: 'tool-insulator',
        no_insulator: 'tool-remove-insulator',
        wire_pos: 'tool-wire-pos',
        wire_neg: 'tool-wire-neg',
        led_correct: 'tool-led-correct',
        led_reversed: 'tool-led-reversed',
        buzzer: 'tool-buzzer'
    };
    const activeBtn = document.getElementById(btnMap[toolName]);
    if (activeBtn) activeBtn.classList.add('active');
}

function loadShape(shapeKey) {
    playSound('pop');
    currentShapeKey = shapeKey;
    document.querySelectorAll('.shape-tab').forEach(tab => tab.classList.remove('active'));
    document.getElementById(`shape-btn-${shapeKey}`).classList.add('active');

    const info = shapesCatalog[shapeKey];
    document.getElementById('current-shape-title').textContent = info.title;
    document.getElementById('current-shape-steps').textContent = info.stepsText;

    // اختيار أداة الصلصال الموصل تلقائياً إذا كان الشكل جديداً
    const st = shapeStates[shapeKey];
    if (!st.partA || !st.partB) {
        selectTool('conductive');
    }

    renderShape();
}

function resetCurrentShape() {
    playSound('pop');
    const wasCompleted = shapeStates[currentShapeKey].completedOnce;
    shapeStates[currentShapeKey] = {
        partA: false,
        partB: false,
        insulator: 'empty',
        wirePos: false,
        wireNeg: false,
        led: 'none',
        buzzer: false,
        completedOnce: wasCompleted
    };
    selectTool('conductive');
    renderShape();
}

// التفاعل عند الضغط على أجزاء الشكل في الـ SVG
function handleZoneClick(zoneType) {
    const st = shapeStates[currentShapeKey];

    if (zoneType === 'partA') {
        if (activeTool === 'conductive') {
            st.partA = true;
            playSound('pop');
            autoAdvanceTool(st);
        } else if (activeTool === 'wire_pos') {
            if (!st.partA) {
                playSound('error');
                updateBanner('danger', '⚠️ شكّل قطعة الصلصال الأولى أولاً قبل غرز السلك الأحمر!');
                return;
            }
            st.wirePos = true;
            playSound('pop');
            autoAdvanceTool(st);
        } else {
            // تسهيل للأطفال: إذا ضغط مباشرة على مكان الصلصال نبنيه له
            st.partA = true;
            playSound('pop');
            autoAdvanceTool(st);
        }
    } else if (zoneType === 'partB') {
        if (activeTool === 'conductive') {
            st.partB = true;
            playSound('pop');
            autoAdvanceTool(st);
        } else if (activeTool === 'wire_neg') {
            if (!st.partB) {
                playSound('error');
                updateBanner('danger', '⚠️ شكّل قطعة الصلصال الثانية أولاً قبل غرز السلك الأسود!');
                return;
            }
            st.wireNeg = true;
            playSound('pop');
            autoAdvanceTool(st);
        } else {
            st.partB = true;
            playSound('pop');
            autoAdvanceTool(st);
        }
    } else if (zoneType === 'insulator') {
        if (activeTool === 'no_insulator') {
            st.insulator = 'short_circuit';
            playSound('buzz');
        } else {
            st.insulator = 'placed';
            playSound('pop');
            autoAdvanceTool(st);
        }
    } else if (zoneType === 'led') {
        if (!st.partA || !st.partB) {
            playSound('error');
            updateBanner('danger', '⚠️ كوّن قطعتي الصلصال أولاً حتى تستطيع غرز أرجل الليد فيهما!');
            return;
        }
        if (activeTool === 'led_reversed') {
            st.led = 'reversed';
            playSound('buzz');
        } else {
            st.led = 'correct';
            playSound('pop');
        }
    } else if (zoneType === 'buzzer') {
        if (!st.partA || !st.partB) {
            playSound('error');
            updateBanner('danger', '⚠️ كوّن قطعتي الصلصال أولاً لتوصيل المروحة أو مصدر الصوت!');
            return;
        }
        st.buzzer = !st.buzzer;
        playSound('motor');
    }

    renderShape();
}

// الانتقال الذكي للأداة التالية لمساعدة الطفل بسلاسة
function autoAdvanceTool(st) {
    if (!st.partA || !st.partB) {
        selectTool('conductive');
    } else if (st.insulator === 'empty') {
        selectTool('insulator');
    } else if (!st.wirePos) {
        selectTool('wire_pos');
    } else if (!st.wireNeg) {
        selectTool('wire_neg');
    } else if (st.led === 'none') {
        selectTool('led_correct');
    }
}

// زر "ساعدني بخطوة" ينفذ الخطوة التالية تلقائياً مع الشرح
function showStepHint() {
    const st = shapeStates[currentShapeKey];
    if (!st.partA) {
        st.partA = true;
        playSound('pop');
        setMascotMessage('🤖', 'الخطوة الأولى تمت!', 'وضعنا قطعة الصلصال الكهربي الأولى (تحتوي على الملح والماء لتوصل الكهرباء).');
    } else if (!st.partB) {
        st.partB = true;
        playSound('pop');
        setMascotMessage('🤖', 'الخطوة الثانية تمت!', 'وضعنا قطعة الصلصال الكهربي الثانية. الآن نحتاج لوضع العازل بينهما!');
    } else if (st.insulator !== 'placed') {
        st.insulator = 'placed';
        playSound('pop');
        setMascotMessage('🛡️', 'وضعنا العازل الكهربائي!', 'الفوم أو عجينة السكر تمنع تلامس قطعتي الصلصال حتى لا تفرغ البطارية وتسخن!');
    } else if (!st.wirePos) {
        st.wirePos = true;
        playSound('pop');
        setMascotMessage('➕', 'وصّلنا السلك الأحمر الموجب!', 'السلك الأحمر القادم من البطارية 9V يوصل بالقطعة الموجبة (+).');
    } else if (!st.wireNeg) {
        st.wireNeg = true;
        playSound('pop');
        setMascotMessage('➖', 'وصّلنا السلك الأسود السالب!', 'السلك الأسود القادم من البطارية 9V يوصل بالقطعة السالبة (-).');
    } else if (st.led !== 'correct') {
        st.led = 'correct';
        playSound('success');
        setMascotMessage('💡', 'ركّبنا الليد بطريقة صحيحة!', 'الطرف الطويل (+) مع الصلصال الموجب، والطرف القصير (-) مع الصلصال السالب!');
    } else if (!st.buzzer) {
        st.buzzer = true;
        playSound('motor');
        setMascotMessage('⚙️', 'أضفنا موتور المروحة ومصدر الصوت!', 'يا سلام! الدائرة الآن تشغل الليد والمروحة معاً!');
    }
    autoAdvanceTool(st);
    renderShape();
}

function updateBanner(type, message) {
    const banner = document.getElementById('circuit-banner');
    const icon = document.getElementById('circuit-icon');
    const msg = document.getElementById('circuit-msg');

    banner.className = 'circuit-status-banner';
    if (type === 'success') {
        banner.classList.add('success');
        icon.textContent = '🌟';
    } else if (type === 'danger') {
        banner.classList.add('danger');
        icon.textContent = '⚠️';
    } else {
        icon.textContent = '🛠️';
    }
    msg.innerHTML = message;
}

// فحص حالة الدائرة الكهربائية العلمية وتحديث المؤثرات
function evaluateCircuit() {
    const st = shapeStates[currentShapeKey];
    const info = shapesCatalog[currentShapeKey];

    // تحديث شريط الخطوات الخمس
    document.getElementById('chk-partA').className = 'step-pill ' + (st.partA ? 'done' : '');
    document.getElementById('chk-partB').className = 'step-pill ' + (st.partB ? 'done' : '');

    const insPill = document.getElementById('chk-insulator');
    if (st.insulator === 'placed') {
        insPill.className = 'step-pill done';
        insPill.textContent = '3. العازل بينهما ✔️';
    } else if (st.insulator === 'short_circuit') {
        insPill.className = 'step-pill error';
        insPill.textContent = '3. تلامس خطير بدون عازل! 💥';
    } else {
        insPill.className = 'step-pill';
        insPill.textContent = '3. العازل بينهما 🛡️';
    }

    document.getElementById('chk-wires').className = 'step-pill ' + ((st.wirePos && st.wireNeg) ? 'done' : '');

    const ledPill = document.getElementById('chk-led');
    if (st.led === 'correct') {
        ledPill.className = 'step-pill done';
        ledPill.textContent = '5. الليد موصل صح ✔️';
    } else if (st.led === 'reversed') {
        ledPill.className = 'step-pill error';
        ledPill.textContent = '5. الليد معكوس الأرجل 🔄';
    } else {
        ledPill.className = 'step-pill';
        ledPill.textContent = '5. غرز الليد (الطويل + والقصير -)';
    }

    // تحذير سخونة البطارية عند التلامس المباشر بدون عازل
    const heatWarn = document.getElementById('battery-heat-warning');
    const isShortCircuit = st.partA && st.partB && st.insulator === 'short_circuit' && st.wirePos && st.wireNeg;
    heatWarn.setAttribute('opacity', isShortCircuit ? '1' : '0');

    // رسائل التوجيه العلمية الدقيقة حسب الورشة
    if (!st.partA || !st.partB) {
        updateBanner('normal', `👈 اضغط على أجزاء الشكل لتكوين <strong>${info.partAName}</strong> و<strong>${info.partBName}</strong> من الصلصال الكهربي!`);
        return { isLit: false, isShortCircuit: false };
    }

    if (st.insulator === 'short_circuit') {
        updateBanner('danger', '💥 <strong>انتبه! لا تفعل ذلك!</strong> تلامس طرفي الصلصال الموصل بدون عازل يسبب قفلة كهربائية: الليد لا يضيء والبطارية تسخن وتفرغ في دقائق! ضع العازل (فوم أو عجين سكر) فوراً.');
        setMascotMessage('😱', 'خطأ علمي مهم تعلمناه في الورشة!', 'عندما تلمس الكرتان بعضهما تمر الكهرباء من الصلصال للصلصال مباشرة ولا تصعد إلى الليد! استخدم أداة (فاصل عازل) لفصلهما.');
        return { isLit: false, isShortCircuit: true };
    }

    if (st.insulator === 'empty') {
        updateBanner('normal', '🛡️ ممتاز! الآن اضغط على المنطقة الفاصلة في المنتصف لوضع <strong>العازل الكهربائي (فوم / ورق / عجين بالسكر)</strong> لمنع تلامس الصلصال!');
        return { isLit: false, isShortCircuit: false };
    }

    if (!st.wirePos || !st.wireNeg) {
        updateBanner('normal', '🔋 الآن وصّل أسلاك البطارية: <strong>السلك الأحمر (+)</strong> بالقطعة الموجبة، و<strong>السلك الأسود (-)</strong> بالقطعة السالبة!');
        return { isLit: false, isShortCircuit: false };
    }

    if (st.led === 'none' && !st.buzzer) {
        updateBanner('normal', '💡 الدائرة جاهزة! اضغط على مكان <strong>الليد LED</strong> لغرز الرجل الطويلة (+) مع الأحمر والقصيرة (-) مع الأسود!');
        return { isLit: false, isShortCircuit: false };
    }

    if (st.led === 'reversed') {
        updateBanner('danger', '🔄 <strong>الليد لا يضيء لأن أطرافه معكوسة!</strong> تذكر قاعدة الورشة: الطرف الطويل للّيد (+) يجب أن يغرز في الصلصال المتصل بالسلك الأحمر، والقصير (-) مع الأسود! اختر (ليد توصيل صحيح) لتعديله.');
        setMascotMessage('🧐', 'لماذا لم ينوّر الليد؟', 'الليد يسمح بمرور التيار في اتجاه واحد فقط! اقلب أرجل الليد بحيث تكون الرجل الطويلة مع الموجب (+) والقصيرة مع السالب (-).');
        return { isLit: false, isShortCircuit: false };
    }

    // نجاح كامل! الدائرة مكتملة والليد يضيء
    updateBanner('success', `🎉 <strong>رائع يا عالم ديسكفري!</strong> أضاء الشكل بنجاح لأن الصلصال الموصل به ملح وماء، والعازل بالمنتصف يمنع التلامس، وأطراف الليد (+ و -) في مكانها الصحيح!`);
    setMascotMessage('🥳', 'إبداع حقيقي! الشكل ينوّر الآن!', 'يمكنك أيضاً تجربة إضافة (مصدر صوت / موتور مروحة) أو تجربة ماذا يحدث لو عكسنا الليد أو أزلنا العازل، أو الانتقال للشكل التالي!');

    if (!st.completedOnce) {
        st.completedOnce = true;
        playSound('success');
        addScore(50);
        const statusEl = document.getElementById(`status-${currentShapeKey}`);
        if (statusEl) statusEl.textContent = '✅🌟';
    }

    return { isLit: true, isShortCircuit: false };
}

// رسم الشكل التفاعلي والأسلاك والليد داخل الـ SVG
function renderShape() {
    const st = shapeStates[currentShapeKey];
    const info = shapesCatalog[currentShapeKey];
    const circuitResult = evaluateCircuit();

    const shapeLayer = document.getElementById('shape-layer');
    const wiresLayer = document.getElementById('wires-layer');
    const compLayer = document.getElementById('components-layer');

    shapeLayer.innerHTML = '';
    wiresLayer.innerHTML = '';
    compLayer.innerHTML = '';

    const colorA = st.partA ? info.colorA : '#cbd5e1';
    const colorB = st.partB ? info.colorB : '#cbd5e1';
    const strokeA = st.partA ? '#1e293b' : '#64748b';
    const strokeB = st.partB ? '#1e293b' : '#64748b';
    const dashA = st.partA ? 'none' : '8,5';
    const dashB = st.partB ? 'none' : '8,5';

    let insFill = '#f8fafc';
    let insLabel = 'اضغط لوضع العازل 🛡️';
    if (st.insulator === 'placed') {
        insFill = '#fef08a';
        insLabel = 'عازل (فوم / سكر) 🛡️';
    } else if (st.insulator === 'short_circuit') {
        insFill = '#ef4444';
        insLabel = '💥 تلامس بدون عازل!';
    }

    // رسم كل شكل من الأشكال الـ 6 بدقة وبهجة
    if (currentShapeKey === 'balls') {
        const shiftX = st.insulator === 'short_circuit' ? 32 : 0;
        shapeLayer.innerHTML = `
            <!-- الكرة الأولى (+) -->
            <g class="clickable-zone" onclick="handleZoneClick('partA')" filter="url(#clayShadow)">
                <circle cx="${355 + shiftX}" cy="265" r="78" fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <text x="${355 + shiftX}" y="265" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">${st.partA ? 'صلصال موصل (+)' : 'اضغط لتشكيل كرة (+)'}</text>
                <text x="${355 + shiftX}" y="290" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">${st.partA ? 'ماء + دقيق + ملح 🧂' : ''}</text>
            </g>
            <!-- الكرة الثانية (-) -->
            <g class="clickable-zone" onclick="handleZoneClick('partB')" filter="url(#clayShadow)">
                <circle cx="${555 - shiftX}" cy="265" r="78" fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <text x="${555 - shiftX}" y="265" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">${st.partB ? 'صلصال موصل (-)' : 'اضغط لتشكيل كرة (-)'}</text>
                <text x="${555 - shiftX}" y="290" text-anchor="middle" fill="#fff" font-size="12" font-weight="700">${st.partB ? 'ماء + دقيق + ملح 🧂' : ''}</text>
            </g>
            <!-- الفاصل العازل بين الكرتين -->
            <g class="clickable-zone" onclick="handleZoneClick('insulator')">
                <rect x="435" y="195" width="40" height="140" rx="12" fill="${insFill}" stroke="#475569" stroke-width="3" stroke-dasharray="${st.insulator === 'empty' ? '6,4' : 'none'}"/>
                <text x="455" y="362" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="900">${insLabel}</text>
            </g>
        `;
    } else if (currentShapeKey === 'snail') {
        shapeLayer.innerHTML = `
            <!-- جسم الحلزون وقرونه (-) -->
            <g class="clickable-zone" onclick="handleZoneClick('partB')" filter="url(#clayShadow)">
                <path d="M 270 340 Q 260 375 310 375 L 575 375 Q 625 375 630 315 Q 635 260 605 245 L 615 170 L 595 170 L 590 245 L 570 245 L 560 175 L 542 175 L 555 255 Q 535 320 460 330 L 295 330 Z"
                      fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <circle cx="605" cy="165" r="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
                <circle cx="550" cy="170" r="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>
                <text x="435" y="362" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="900">${st.partB ? 'جسم الحلزون الموصل (-)' : 'اضغط لتشكيل جسم الحلزون (-)'}</text>
            </g>
            <!-- الشريط العازل أسفل الصدفة -->
            <g class="clickable-zone" onclick="handleZoneClick('insulator')">
                <path d="M 325 312 Q 425 348 530 295" fill="none" stroke="${insFill}" stroke-width="22" stroke-linecap="round"/>
                <path d="M 325 312 Q 425 348 530 295" fill="none" stroke="#334155" stroke-width="2.5" stroke-dasharray="6,4"/>
                <text x="430" y="322" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="900">${insLabel}</text>
            </g>
            <!-- صدفة الحلزون الدائرية (+) -->
            <g class="clickable-zone" onclick="handleZoneClick('partA')" filter="url(#clayShadow)">
                <circle cx="425" cy="220" r="92" fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <path d="M 425 220 m 0 -15 a 15 15 0 1 1 -15 15 a 32 32 0 1 1 32 32 a 52 52 0 1 1 -52 -52 a 72 72 0 1 1 72 72" fill="none" stroke="#93c5fd" stroke-width="5" stroke-linecap="round"/>
                <!-- نقاط زينة على الصدفة كما في الصورة -->
                <circle cx="385" cy="175" r="7" fill="#ec4899"/>
                <circle cx="460" cy="170" r="7" fill="#ec4899"/>
                <circle cx="370" cy="240" r="7" fill="#ec4899"/>
                <circle cx="470" cy="250" r="7" fill="#ec4899"/>
                <text x="425" y="220" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="900">${st.partA ? 'صدفة الحلزون (+)' : 'اضغط لتشكيل الصدفة (+)'}</text>
            </g>
        `;
    } else if (currentShapeKey === 'fish') {
        shapeLayer.innerHTML = `
            <!-- ذيل وزعانف وجسم السمكة (+) -->
            <g class="clickable-zone" onclick="handleZoneClick('partA')" filter="url(#clayShadow)">
                <!-- الذيل -->
                <polygon points="220,250 150,185 150,315" fill="#f59e0b" stroke="${strokeA}" stroke-width="3"/>
                <!-- الزعانف البنفسجية كما في الصورة -->
                <ellipse cx="380" cy="150" rx="65" ry="22" fill="#9333ea" stroke="${strokeA}" stroke-width="2.5"/>
                <ellipse cx="390" cy="350" rx="50" ry="18" fill="#9333ea" stroke="${strokeA}" stroke-width="2.5"/>
                <!-- الجسم الرئيسي -->
                <path d="M 215 250 C 250 145, 450 145, 520 178 L 520 322 C 450 355, 250 355, 215 250 Z"
                      fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <!-- زعنفة جانبية -->
                <path d="M 380 245 Q 435 230 435 265 Q 435 295 380 280 Z" fill="#9333ea"/>
                <text x="375" y="225" text-anchor="middle" fill="#0f172a" font-size="16" font-weight="900">${st.partA ? 'جسم السمكة (+)' : 'اضغط لتشكيل جسم السمكة (+)'}</text>
            </g>
            <!-- القوس العازل بين الرأس والجسم -->
            <g class="clickable-zone" onclick="handleZoneClick('insulator')">
                <path d="M 522 175 Q 552 250 522 325 L 548 320 Q 578 250 548 180 Z"
                      fill="${insFill}" stroke="#334155" stroke-width="3" stroke-dasharray="${st.insulator === 'empty' ? '6,4' : 'none'}"/>
                <text x="545" y="365" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="900">${insLabel}</text>
            </g>
            <!-- وجه السمكة (-) -->
            <g class="clickable-zone" onclick="handleZoneClick('partB')" filter="url(#clayShadow)">
                <path d="M 550 180 C 615 195, 655 225, 660 250 C 655 275, 615 305, 550 320 Q 575 250 550 180 Z"
                      fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <circle cx="605" cy="225" r="14" fill="#ffffff" stroke="#475569" stroke-width="2"/>
                <circle cx="609" cy="225" r="5" fill="#0f172a"/>
                <text x="610" y="275" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="900">${st.partB ? 'الوجه (-)' : 'الوجه (-)'}</text>
            </g>
        `;
    } else if (currentShapeKey === 'octopus') {
        shapeLayer.innerHTML = `
            <!-- النصف العلوي لرأس الأخطبوط (+) -->
            <g class="clickable-zone" onclick="handleZoneClick('partA')" filter="url(#clayShadow)">
                <path d="M 365 205 C 365 95, 565 95, 565 205 Z"
                      fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <text x="465" y="150" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="900">${st.partA ? 'أعلى رأس الأخطبوط (+)' : 'اضغط لتشكيل أعلى الرأس (+)'}</text>
            </g>
            <!-- الشريط العازل في منتصف رأس الأخطبوط -->
            <g class="clickable-zone" onclick="handleZoneClick('insulator')">
                <rect x="362" y="205" width="206" height="24" rx="8" fill="${insFill}" stroke="#334155" stroke-width="3" stroke-dasharray="${st.insulator === 'empty' ? '6,4' : 'none'}"/>
                <text x="465" y="222" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="900">${insLabel}</text>
            </g>
            <!-- النصف السفلي والأرجل الثمانية (-) -->
            <g class="clickable-zone" onclick="handleZoneClick('partB')" filter="url(#clayShadow)">
                <rect x="365" y="230" width="200" height="55" rx="12" fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <!-- 8 أرجل للأخطبوط -->
                <path d="M 375 280 Q 300 330 270 375" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 400 282 Q 345 350 325 395" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 428 282 Q 395 360 385 410" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 455 282 Q 445 360 440 415" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 480 282 Q 490 360 495 415" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 508 282 Q 535 360 550 410" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 532 282 Q 580 350 605 395" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <path d="M 555 280 Q 620 330 655 375" fill="none" stroke="${colorB}" stroke-width="18" stroke-linecap="round"/>
                <text x="465" y="263" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900">${st.partB ? 'الجسم والأرجل الثمانية (-)' : 'اضغط لتشكيل الأرجل (-)'}</text>
            </g>
        `;
    } else if (currentShapeKey === 'butterfly') {
        shapeLayer.innerHTML = `
            <!-- الجناح الأيمن للفراشة (+) -->
            <g class="clickable-zone" onclick="handleZoneClick('partA')" filter="url(#clayShadow)">
                <ellipse cx="360" cy="190" rx="85" ry="62" fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <ellipse cx="375" cy="310" rx="68" ry="50" fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <!-- دوائر الزينة الوردية والصفراء كما في صورة الورشة -->
                <circle cx="345" cy="185" r="30" fill="#ec4899"/>
                <circle cx="345" cy="185" r="18" fill="#facc15"/>
                <circle cx="365" cy="315" r="24" fill="#ec4899"/>
                <circle cx="365" cy="315" r="13" fill="#facc15"/>
                <text x="355" y="250" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900">${st.partA ? 'الجناح الموجب (+)' : 'اضغط لتشكيل الجناح (+)'}</text>
            </g>
            <!-- الجناح الأيسر للفراشة (-) -->
            <g class="clickable-zone" onclick="handleZoneClick('partB')" filter="url(#clayShadow)">
                <ellipse cx="570" cy="190" rx="85" ry="62" fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <ellipse cx="555" cy="310" rx="68" ry="50" fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <circle cx="585" cy="185" r="30" fill="#ec4899"/>
                <circle cx="585" cy="185" r="18" fill="#facc15"/>
                <circle cx="565" cy="315" r="24" fill="#ec4899"/>
                <circle cx="565" cy="315" r="13" fill="#facc15"/>
                <text x="575" y="250" text-anchor="middle" fill="#ffffff" font-size="14" font-weight="900">${st.partB ? 'الجناح السالب (-)' : 'اضغط لتشكيل الجناح (-)'}</text>
            </g>
            <!-- جسم الفراشة في المنتصف (العازل - عجينة سكر بدون ملح) -->
            <g class="clickable-zone" onclick="handleZoneClick('insulator')">
                <rect x="442" y="135" width="46" height="235" rx="23" fill="${st.insulator === 'placed' ? '#facc15' : insFill}" stroke="#334155" stroke-width="3" stroke-dasharray="${st.insulator === 'empty' ? '6,4' : 'none'}"/>
                <path d="M 455 135 Q 435 100 420 105" fill="none" stroke="#ec4899" stroke-width="5" stroke-linecap="round"/>
                <path d="M 475 135 Q 495 100 510 105" fill="none" stroke="#ec4899" stroke-width="5" stroke-linecap="round"/>
                <text x="465" y="260" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="900">عازل</text>
                <text x="465" y="280" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="800">(عجينة سكر)</text>
            </g>
        `;
    } else if (currentShapeKey === 'car') {
        shapeLayer.innerHTML = `
            <!-- المستطيل العلوي للسيارة (+) -->
            <g class="clickable-zone" onclick="handleZoneClick('partA')" filter="url(#clayShadow)">
                <path d="M 330 220 L 365 145 L 515 145 L 555 220 Z" fill="${colorA}" stroke="${strokeA}" stroke-width="3"/>
                <rect x="300" y="205" width="285" height="38" rx="10" fill="${colorA}" stroke="${strokeA}" stroke-width="3.5" stroke-dasharray="${dashA}"/>
                <text x="442" y="195" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="900">${st.partA ? 'طبقة صلصال عليا (+)' : 'اضغط لتشكيل الطبقة العليا (+)'}</text>
            </g>
            <!-- طبقة العازل في المنتصف + العجلات العازلة الأربع -->
            <g class="clickable-zone" onclick="handleZoneClick('insulator')">
                <rect x="295" y="243" width="295" height="28" rx="8" fill="${insFill}" stroke="#334155" stroke-width="3" stroke-dasharray="${st.insulator === 'empty' ? '6,4' : 'none'}"/>
                <text x="442" y="262" text-anchor="middle" fill="#0f172a" font-size="12" font-weight="900">${insLabel}</text>
            </g>
            <!-- المستطيل السفلي للسيارة (-) -->
            <g class="clickable-zone" onclick="handleZoneClick('partB')" filter="url(#clayShadow)">
                <rect x="300" y="271" width="285" height="44" rx="10" fill="${colorB}" stroke="${strokeB}" stroke-width="3.5" stroke-dasharray="${dashB}"/>
                <text x="442" y="298" text-anchor="middle" fill="#ffffff" font-size="15" font-weight="900">${st.partB ? 'طبقة صلصال سفلى (-)' : 'اضغط لتشكيل الطبقة السفلى (-)'}</text>
                <!-- العجلات الأربع من العازل -->
                <circle cx="355" cy="325" r="28" fill="#fef3c7" stroke="#475569" stroke-width="4"/>
                <circle cx="355" cy="325" r="10" fill="#94a3b8"/>
                <circle cx="525" cy="325" r="28" fill="#fef3c7" stroke="#475569" stroke-width="4"/>
                <circle cx="525" cy="325" r="10" fill="#94a3b8"/>
            </g>
        `;
    }

    // رسم الأسلاك بين البطارية (في أقصى اليسار) والشكل
    const batPosStart = { x: 71, y: 295 }; // القطب الموجب الأحمر للبطارية
    const batNegStart = { x: 114, y: 295 }; // القطب السالب الأسود للبطارية

    if (st.wirePos) {
        wiresLayer.innerHTML += `
            <path d="M ${batPosStart.x} ${batPosStart.y} C ${batPosStart.x} 110, ${info.wirePosTarget.x - 80} 120, ${info.wirePosTarget.x} ${info.wirePosTarget.y}"
                  fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
            <circle cx="${info.wirePosTarget.x}" cy="${info.wirePosTarget.y}" r="8" fill="#ef4444" stroke="#fff" stroke-width="2"/>
            <text x="${info.wirePosTarget.x}" y="${info.wirePosTarget.y - 12}" text-anchor="middle" fill="#dc2626" font-size="16" font-weight="900">+</text>
        `;
    } else {
        wiresLayer.innerHTML += `
            <g class="clickable-zone" onclick="handleZoneClick('partA')">
                <circle cx="${info.wirePosTarget.x}" cy="${info.wirePosTarget.y}" r="14" fill="#fee2e2" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4,3"/>
                <text x="${info.wirePosTarget.x}" y="${info.wirePosTarget.y + 5}" text-anchor="middle" fill="#dc2626" font-size="14" font-weight="900">+🔌</text>
            </g>
        `;
    }

    if (st.wireNeg) {
        wiresLayer.innerHTML += `
            <path d="M ${batNegStart.x} ${batNegStart.y} C ${batNegStart.x + 40} 430, ${info.wireNegTarget.x - 60} 430, ${info.wireNegTarget.x} ${info.wireNegTarget.y}"
                  fill="none" stroke="#0f172a" stroke-width="6" stroke-linecap="round"/>
            <circle cx="${info.wireNegTarget.x}" cy="${info.wireNegTarget.y}" r="8" fill="#0f172a" stroke="#fff" stroke-width="2"/>
            <text x="${info.wireNegTarget.x}" y="${info.wireNegTarget.y - 12}" text-anchor="middle" fill="#0f172a" font-size="16" font-weight="900">-</text>
        `;
    } else {
        wiresLayer.innerHTML += `
            <g class="clickable-zone" onclick="handleZoneClick('partB')">
                <circle cx="${info.wireNegTarget.x}" cy="${info.wireNegTarget.y}" r="14" fill="#e2e8f0" stroke="#0f172a" stroke-width="2.5" stroke-dasharray="4,3"/>
                <text x="${info.wireNegTarget.x}" y="${info.wireNegTarget.y + 5}" text-anchor="middle" fill="#0f172a" font-size="14" font-weight="900">-🔌</text>
            </g>
        `;
    }

    // رسم الليد (LED) مع توضيح الطرف الطويل (+) والقصير (-)
    const lx = info.ledHead.x;
    const ly = info.ledHead.y;
    const posLeg = info.ledPosLeg;
    const negLeg = info.ledNegLeg;

    if (st.led === 'none') {
        compLayer.innerHTML += `
            <g class="clickable-zone" onclick="handleZoneClick('led')">
                <line x1="${lx - 8}" y1="${ly + 18}" x2="${posLeg.x}" y2="${posLeg.y}" stroke="#94a3b8" stroke-width="3" stroke-dasharray="5,4"/>
                <line x1="${lx + 8}" y1="${ly + 18}" x2="${negLeg.x}" y2="${negLeg.y}" stroke="#94a3b8" stroke-width="3" stroke-dasharray="5,4"/>
                <circle cx="${lx}" cy="${ly}" r="26" fill="#ffffff" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="5,4"/>
                <text x="${lx}" y="${ly + 6}" text-anchor="middle" font-size="20">💡</text>
                <text x="${lx}" y="${ly - 32}" text-anchor="middle" fill="#6d28d9" font-size="13" font-weight="900">اضغط لغرز الليد LED</text>
            </g>
        `;
    } else {
        const isLit = circuitResult.isLit;
        const isRev = st.led === 'reversed';
        const bulbColor = isLit ? '#facc15' : (isRev ? '#94a3b8' : '#fca5a5');

        compLayer.innerHTML += `
            <g class="clickable-zone" onclick="handleZoneClick('led')">
                ${isLit ? `<circle cx="${lx}" cy="${ly}" r="68" fill="url(#ledGlow)" class="led-glow-anim"/>` : ''}
                <!-- أرجل الليد: الطويلة (+) والقصيرة (-) -->
                <line x1="${lx - 7}" y1="${ly + 16}" x2="${posLeg.x}" y2="${posLeg.y}" stroke="${isRev ? '#1e293b' : '#dc2626'}" stroke-width="4"/>
                <line x1="${lx + 7}" y1="${ly + 16}" x2="${negLeg.x}" y2="${negLeg.y}" stroke="${isRev ? '#dc2626' : '#1e293b'}" stroke-width="4"/>
                <!-- رأس الليد -->
                <path d="M ${lx - 18} ${ly + 16} L ${lx - 18} ${ly - 4} A 18 18 0 0 1 ${lx + 18} ${ly - 4} L ${lx + 18} ${ly + 16} Z"
                      fill="${bulbColor}" stroke="#1e293b" stroke-width="3"/>
                <rect x="${lx - 21}" y="${ly + 13}" width="42" height="7" rx="3" fill="#475569"/>
                <!-- تسمية الأرجل (طويل + وقصير -) -->
                <text x="${posLeg.x - 14}" y="${posLeg.y - 8}" fill="#dc2626" font-size="13" font-weight="900">${isRev ? 'قصير (-)' : 'طويل (+)'}</text>
                <text x="${negLeg.x + 14}" y="${negLeg.y - 8}" fill="#0f172a" font-size="13" font-weight="900">${isRev ? 'طويل (+)' : 'قصير (-)'}</text>
                <text x="${lx}" y="${ly - 28}" text-anchor="middle" fill="#0f172a" font-size="13" font-weight="900">
                    ${isLit ? '✨ الليد مضيء! ✨' : (isRev ? '⚠️ الليد معكوس!' : 'الليد جاهز')}
                </text>
            </g>
        `;
    }

    // رسم المروحة / مصدر الصوت الإضافي (كما في الخطوة 6 و 7 في أوراق الورشة)
    const bx = info.buzzerPos.x;
    const by = info.buzzerPos.y;
    const fanSpinning = st.buzzer && st.partA && st.partB && st.insulator === 'placed' && st.wirePos && st.wireNeg;

    if (st.buzzer) {
        compLayer.innerHTML += `
            <g class="clickable-zone" onclick="handleZoneClick('buzzer')">
                <line x1="${bx - 10}" y1="${by}" x2="${info.wirePosTarget.x}" y2="${info.wirePosTarget.y}" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="4,2"/>
                <line x1="${bx + 10}" y1="${by}" x2="${info.wireNegTarget.x}" y2="${info.wireNegTarget.y}" stroke="#0f172a" stroke-width="2.5" stroke-dasharray="4,2"/>
                <circle cx="${bx}" cy="${by}" r="26" fill="#e0f2fe" stroke="#0284c7" stroke-width="3"/>
                <g class="${fanSpinning ? 'fan-spin' : ''}">
                    <ellipse cx="${bx}" cy="${by - 12}" rx="6" ry="12" fill="#0284c7"/>
                    <ellipse cx="${bx}" cy="${by + 12}" rx="6" ry="12" fill="#0284c7"/>
                    <ellipse cx="${bx - 12}" cy="${by}" rx="12" ry="6" fill="#0284c7"/>
                    <ellipse cx="${bx + 12}" cy="${by}" rx="12" ry="6" fill="#0284c7"/>
                    <circle cx="${bx}" cy="${by}" r="6" fill="#facc15"/>
                </g>
                <text x="${bx}" y="${by + 42}" text-anchor="middle" fill="#0369a1" font-size="12" font-weight="900">
                    ${fanSpinning ? '🔊 المروحة تدور وتصدر صوتاً!' : 'مروحة / صوت'}
                </text>
            </g>
        `;
    }
}

// ==================== القسم الثالث: تحدي العلماء الصغار (أسئلة الورشة العلمية) ====================
const quizQuestions = [
    {
        illustration: '🧂💧⚡',
        question: '1. لماذا يوصل الصلصال الكهربي التيار الكهربائي ويُضيء الليد؟',
        options: [
            'لأننا وضعنا فيه ملح طعام ذائب في الماء مع الدقيق 🧂💧',
            'لأننا وضعنا فيه الكثير من السكر فقط 🍬',
            'لأن لونه أحمر أو أصفر 🎨'
        ],
        correct: 0,
        explanation: 'أحسنت! الملح عندما يذوب في الماء داخل العجين يتفكك إلى أيونات حرة تسمح بمرور التيار الكهربائي!'
    },
    {
        illustration: '🛡️🍬🧽',
        question: '2. ما هي المواد التي استخدمناها في الورشة كـ (عازل) لفصل قطعتي الصلصال الموصل؟',
        options: [
            'قطعة حديد أو سلك نحاس مكشوف',
            'قطعة ورق أو فوم أو عجينة بالسكر (ماء ودقيق وسكر بدون ملح) 🛡️',
            'صلصال مالح جداً'
        ],
        correct: 1,
        explanation: 'ممتاز! الورق والفوم والبلاستيك والخشب وعجينة السكر كلها مواد عازلة لا توصل الكهرباء وتحمي الدائرة.'
    },
    {
        illustration: '💥🟠🟣',
        question: '3. ماذا يحدث إذا تلامس طرفا الصلصال الموصل للكهرباء مباشرة بدون وضع عازل بينهما؟',
        options: [
            'يضيء الليد بقوة أكبر مرتين',
            'تتحول البطارية إلى قطعة حلوى',
            'لا يضيء الليد، وتفرغ البطارية نفسها وتسخن وتتلف خلال دقائق! ⚠️'
        ],
        correct: 2,
        explanation: 'صح جداً! تلامس طرفي الصلصال الموصل يسبب دائرة قصر (قفلة)، فيمر التيار بين الكرتين ولا يمر في الليد وتسخن البطارية.'
    },
    {
        illustration: '💡➕➖',
        question: '4. كيف نميّز بين الطرف الموجب والطرف السالب في الليد (LED) عند توصيله بالصلصال؟',
        options: [
            'الطرف الطويل هو الموجب (+) ويوصل مع السلك الأحمر، والقصير هو السالب (-) ويوصل مع الأسود',
            'الطرفان متشابهان تماماً ولا فرق بينهما',
            'الطرف القصير هو الموجب والطويل هو السالب'
        ],
        correct: 0,
        explanation: 'رائع يا بطل! الليد له رجل طويلة موجبة (+) تغرز في الصلصال المتصل بالسلك الأحمر، ورجل قصيرة سالبة (-) تغرز مع السلك الأسود.'
    },
    {
        illustration: '🔋❌💡',
        question: '5. لماذا لا نوصّل الليد (LED) مباشرة بأطراف بطارية 9 فولت بدون الصلصال الكهربي؟',
        options: [
            'لأن البطارية 9 فولت قوية جداً وستحرق الليد فوراً، بينما الصلصال الكهربي يعمل كمقاومة تحمي الليد!',
            'لأن الأسلاك قصيرة جداً',
            'لأن الليد يحب اللعب بالصلصال فقط'
        ],
        correct: 0,
        explanation: 'معلومة ذهبية من الورشة! الصلصال الكهربي يوصل الكهرباء ولكن بمقاومة مناسبة تحمي الليد من الاحتراق ببطارية 9V.'
    },
    {
        illustration: '🦋🐌🐠',
        question: '6. في نشاط الفراشة المضيئة والسمكة، أين وضعنا العازل الكهربائي؟',
        options: [
            'فوق عيون السمكة وفوق الليد',
            'في منتصف الفراشة (الجسم الأصفر من عجينة السكر) وفي قوس فاصل بين وجه السمكة وجسمها!',
            'لم نستخدم أي عازل في الفراشة أو السمكة'
        ],
        correct: 1,
        explanation: 'عبقري! في كل الأشكال لازم نفصل الجزء الموجب عن الجزء السالب بفاصل عازل حتى يمر التيار عبر الليد فيضيء.'
    },
    {
        illustration: '🚗🔊⚙️',
        question: '7. غير الليد المضيء، ما المكونات الأخرى التي يمكننا تشغيلها مع صلصال ديسكفري الكهربي؟',
        options: [
            'مصدر الصوت (الجرس) والموتور لصنع مروحة تدور! 🔊⚙️',
            'الورق والكرتون فقط',
            'الماء البارد فقط'
        ],
        correct: 0,
        explanation: 'ممتاز! كما رأينا في نهاية الورشة، يمكننا توصيل مصدر الصوت والموتور والليد وابتكار أشكال كثيرة ممتعة!'
    }
];

let currentQuizIndex = 0;

function loadQuizQuestion() {
    const q = quizQuestions[currentQuizIndex];
    document.getElementById('quiz-progress').textContent = `السؤال ${currentQuizIndex + 1} من ${quizQuestions.length}`;
    document.getElementById('quiz-illustration').textContent = q.illustration;
    document.getElementById('quiz-question').textContent = q.question;

    const optionsDiv = document.getElementById('quiz-options');
    optionsDiv.innerHTML = '';

    q.options.forEach((optText, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-opt-btn';
        btn.textContent = optText;
        btn.onclick = () => checkQuizAnswer(idx, btn);
        optionsDiv.appendChild(btn);
    });

    document.getElementById('quiz-feedback').style.display = 'none';
}

function checkQuizAnswer(selectedIndex, clickedBtn) {
    const q = quizQuestions[currentQuizIndex];
    const allBtns = document.querySelectorAll('.quiz-opt-btn');
    allBtns.forEach(b => b.disabled = true);

    const feedbackDiv = document.getElementById('quiz-feedback');
    const feedbackText = document.getElementById('feedback-text');
    feedbackDiv.style.display = 'block';

    if (selectedIndex === q.correct) {
        clickedBtn.classList.add('correct');
        playSound('success');
        addScore(25);
        feedbackText.innerHTML = `✅ <span style="color:#15803d">${q.explanation}</span>`;
        setMascotMessage('🌟', 'إجابة صحيحة يا عالم المستقبل!', q.explanation);
    } else {
        clickedBtn.classList.add('wrong');
        allBtns[q.correct].classList.add('correct');
        playSound('error');
        feedbackText.innerHTML = `💡 <span style="color:#b91c1c">الإجابة الصحيحة هي:</span> ${q.explanation}`;
        setMascotMessage('🤗', 'معلومة مفيدة نتعلمها معاً!', q.explanation);
    }

    const nextBtn = document.getElementById('btn-next-q');
    if (currentQuizIndex === quizQuestions.length - 1) {
        nextBtn.textContent = '🎉 إعادة التحدي من البداية';
    } else {
        nextBtn.textContent = 'السؤال التالي ⬅️';
    }
}

function nextQuizQuestion() {
    playSound('pop');
    currentQuizIndex = (currentQuizIndex + 1) % quizQuestions.length;
    loadQuizQuestion();
}

// ==================== مشغل الفيديو التوضيحي التفاعلي (باللهجة المصرية المراجعة لغوياً وصوتياً) ====================
let currentVideoStep = 0;
let isVideoPlaying = false;
let videoTimer = null;

const tutorialScenes = [
    {
        badge: 'مشهد 1 من 6: سر الصلصال الكهربي 🧂',
        title: '1. إزاي بنعمل صلصال بيوصّل كهربا وعجينة عازلة؟',
        desc: 'في مطبخ الصلصال: بنخلط (مية + دقيق + ملح طعام 🧂) عشان نعمل صلصال بيوصّل الكهربا وينوّر الليد! ولو خلطنا (مية + دقيق + سكر 🍬) من غير ملح، أو استخدمنا حتة فوم، بنعمل عازل يمنع مرور الكهربا.',
        speech: 'أهلاً بيكم يا أبطال في ورشة ديسكفري! في الأول تعالوا نعرف سر الصلصال الكهربي. لما بنخلط مَيَّة ودقيق وملح طعام، الملح بيخلي الصلصال يوصّل كهربا وينوّر الليد! إنما لو حطينا سُكَّر بدل الملح، أو استخدمنا حتة فوم أو ورق، ده بيبقى عازل مبيرضاش يعدي الكهربا خالص.',
        cursor: { x: 420, y: 190 },
        render: () => `
            <g transform="translate(190, 75)">
                <rect x="0" y="0" width="220" height="210" rx="22" fill="#1e293b" stroke="#22c55e" stroke-width="4"/>
                <text x="110" y="42" text-anchor="middle" fill="#4ade80" font-size="18" font-weight="900">صلصال بيوصّل كهربا ⚡</text>
                <text x="110" y="95" text-anchor="middle" font-size="42">💧 + 🌾 + 🧂</text>
                <text x="110" y="145" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">مية + دقيق + ملح</text>
                <text x="110" y="180" text-anchor="middle" fill="#facc15" font-size="14" font-weight="900">بينوّر الليد! 💡✔️</text>
            </g>
            <g transform="translate(450, 75)">
                <rect x="0" y="0" width="220" height="210" rx="22" fill="#1e293b" stroke="#38bdf8" stroke-width="4"/>
                <text x="110" y="42" text-anchor="middle" fill="#38bdf8" font-size="18" font-weight="900">عازل للكهربا 🛡️</text>
                <text x="110" y="95" text-anchor="middle" font-size="42">🍬 أو 🧽</text>
                <text x="110" y="145" text-anchor="middle" fill="#fff" font-size="15" font-weight="800">عجينة سكر أو حتة فوم</text>
                <text x="110" y="180" text-anchor="middle" fill="#94a3b8" font-size="14" font-weight="900">بيفصل بين الحتتين 🛡️</text>
            </g>
        `
    },
    {
        badge: 'مشهد 2 من 6: تشكيل الصلصال 🔴',
        title: '2. بنختار أداة (صلصال كهربي) وندوس على جزئين الشكل!',
        desc: 'في ورشة الأشكال: بندوس على الحتة الأولى عشان نشكلها وتبقى هي الموجب (+)، وندوس على الحتة التانية عشان تبقى هي السالب (-)، ونسيب بينهم مسافة.',
        speech: 'الخطوة التانية في الورشة: بنختار أداة الصلصال الكهربي من الجنب اليمين، وندوس على الرسمة عشان نشكّل كورتين أو جزئين من الصلصال، ونسيب بينهم مسافة صغيرة.',
        cursor: { x: 350, y: 230 },
        render: () => `
            <circle cx="350" cy="220" r="72" fill="#f97316" stroke="#fff" stroke-width="4"/>
            <text x="350" y="220" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">كورة صلصال (+)</text>
            <text x="350" y="245" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">فيها ملح 🧂</text>

            <circle cx="560" cy="220" r="72" fill="#7c3aed" stroke="#fff" stroke-width="4"/>
            <text x="560" y="220" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">كورة صلصال (-)</text>
            <text x="560" y="245" text-anchor="middle" fill="#fff" font-size="13" font-weight="700">فيها ملح 🧂</text>
        `
    },
    {
        badge: 'مشهد 3 من 6: نحط العازل في النص 🛡️',
        title: '3. بنختار أداة (فاصل عازل) ونحطه في النص بين الحتتين!',
        desc: 'لازم نفصل بين حتتين الصلصال الكهربي بحاجز عازل (زي حتة فوم أو ورق أو عجينة بالسكر من غير ملح) عشان مفيش كورة تلمس التانية.',
        speech: 'الخطوة التالتة ومهمة جداً: بنختار الفاصل العازل، اللي هو الفوم أو عجينة السكر، ونحطه في النص بالظبط عشان نفصل بين حتتين الصلصال الكهربي وميلمسوش بعض أبداً.',
        cursor: { x: 455, y: 220 },
        render: () => `
            <circle cx="350" cy="220" r="72" fill="#f97316" stroke="#fff" stroke-width="4"/>
            <text x="350" y="225" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">صلصال (+)</text>

            <circle cx="560" cy="220" r="72" fill="#7c3aed" stroke="#fff" stroke-width="4"/>
            <text x="560" y="225" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">صلصال (-)</text>

            <rect x="435" y="145" width="40" height="150" rx="12" fill="#fef08a" stroke="#eab308" stroke-width="4"/>
            <text x="455" y="325" text-anchor="middle" fill="#facc15" font-size="15" font-weight="900">🛡️ عازل في النص (فوم / عجينة سكر)</text>
        `
    },
    {
        badge: 'مشهد 4 من 6: توصيل سلوك البطارية 9V 🔋',
        title: '4. بنوصّل السلك الأحمر (+) والسلك الأسود (-) من البطارية!',
        desc: 'بنركب جاك البطارية الـ 9 فولت، ونوصّل السلك الأحمر الموجب (+) في الكورة الأولى، والسلك الأسود السالب (-) في الكورة التانية.',
        speech: 'الخطوة الرابعة: بنجيب البطارية التسعة فولت، ونوصّل السلك الأحمر اللي هو الطرف الموجب بحتة الصلصال الأولى، والسلك الأسود اللي هو الطرف السالب بالحتة التانية.',
        cursor: { x: 320, y: 200 },
        render: () => `
            <path d="M 81 240 C 81 95, 260 95, 320 200" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
            <path d="M 119 240 C 150 355, 450 355, 560 250" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>

            <circle cx="350" cy="220" r="72" fill="#f97316" stroke="#fff" stroke-width="4"/>
            <text x="350" y="225" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">موجب (+)</text>

            <circle cx="560" cy="220" r="72" fill="#7c3aed" stroke="#fff" stroke-width="4"/>
            <text x="560" y="225" text-anchor="middle" fill="#fff" font-size="16" font-weight="900">سالب (-)</text>

            <rect x="435" y="145" width="40" height="150" rx="12" fill="#fef08a" stroke="#eab308" stroke-width="4"/>
        `
    },
    {
        badge: 'مشهد 5 من 6: تركيب الليد المنوّر 💡',
        title: '5. نفتح رجلين الليد ونغرز الطويلة (+) مع الأحمر والقصيرة (-) مع الأسود!',
        desc: 'أول ما نغرز رجل الليد الطويلة في الصلصال الموجب، والرجل القصيرة في الصلصال السالب، الليد هينوّر على طول! ونقدر كمان نركب مروحة أو جرس.',
        speech: 'الخطوة الخامسة: بنمسك الليد ونفتح رجليه الاتنين، وخلي بالك إن الرجل الطويلة هي الموجب فبنغرزها مع السلك الأحمر، والرجل القصيرة هي السالب فبنغرزها مع السلك الأسود. وهوب! الليد هينوّر معانا على طول!',
        cursor: { x: 455, y: 95 },
        render: () => `
            <path d="M 81 240 C 81 95, 260 95, 320 200" fill="none" stroke="#ef4444" stroke-width="6" stroke-linecap="round"/>
            <path d="M 119 240 C 150 355, 450 355, 560 250" fill="none" stroke="#94a3b8" stroke-width="6" stroke-linecap="round"/>

            <circle cx="350" cy="220" r="72" fill="#f97316" stroke="#fff" stroke-width="4"/>
            <circle cx="560" cy="220" r="72" fill="#7c3aed" stroke="#fff" stroke-width="4"/>
            <rect x="435" y="145" width="40" height="150" rx="12" fill="#fef08a" stroke="#eab308" stroke-width="4"/>

            <!-- توهج الليد -->
            <circle cx="455" cy="90" r="65" fill="url(#ledGlow)" class="led-glow-anim"/>
            <line x1="448" y1="106" x2="385" y2="170" stroke="#ef4444" stroke-width="5"/>
            <line x1="462" y1="106" x2="525" y2="170" stroke="#94a3b8" stroke-width="5"/>
            <path d="M 437 106 L 437 86 A 18 18 0 0 1 473 86 L 473 106 Z" fill="#facc15" stroke="#fff" stroke-width="3"/>
            <text x="360" y="150" fill="#fca5a5" font-size="14" font-weight="900">طويلة (+)</text>
            <text x="535" y="150" fill="#cbd5e1" font-size="14" font-weight="900">قصيرة (-)</text>
            <text x="455" y="42" text-anchor="middle" fill="#fde047" font-size="18" font-weight="900">✨ الله! الليد نَوَّر! ✨</text>
        `
    },
    {
        badge: 'مشهد 6 من 6: خلي بالك من الغلطة دي! ⚠️',
        title: '6. اوعى الصلصال يلمس بعضه من غير عازل، واوعى تعكس رجلين الليد!',
        desc: 'لو الكورتين لمسوا بعض من غير عازل، الليد مش هينوّر والبطارية هتسخن وتفضى في دقايق! يلا دلوقتي جرب بإيدك في الموقع!',
        speech: 'آخر نصيحة يا بطل: اوعى تخلي حتتين الصلصال يلمسوا بعض من غير عازل، لأن كدة الليد مش هينوّر والبطارية هتسخن وتفضى بسرعة! يلا دلوقتي جرب بإيدك في الموقع وورينا إبداعاتك!',
        cursor: { x: 455, y: 220 },
        render: () => `
            <circle cx="400" cy="220" r="72" fill="#f97316" stroke="#ef4444" stroke-width="5"/>
            <circle cx="510" cy="220" r="72" fill="#7c3aed" stroke="#ef4444" stroke-width="5"/>
            <circle cx="455" cy="220" r="35" fill="#ef4444"/>
            <text x="455" y="228" text-anchor="middle" fill="#fff" font-size="24" font-weight="900">💥</text>
            <text x="455" y="330" text-anchor="middle" fill="#fca5a5" font-size="17" font-weight="900">❌ لو لمسوا بعض = الليد مش هينوّر والبطارية هتسخن!</text>
        `
    }
];

// اختيار أفضل صوت عربي مصري متاح في المتصفح والويندوز
function getEgyptianArabicVoice() {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // الأولوية 1: صوت مصري صريح (ar-EG مثل Microsoft Hoda أو Microsoft Salma أو Google ar-EG)
    let egVoice = voices.find(v => v.lang && v.lang.toLowerCase().replace('_', '-') === 'ar-eg');
    if (egVoice) return egVoice;

    // الأولوية 2: أي صوت يحتوي اسمه على Egypt أو Hoda أو Salma أو Shakir
    egVoice = voices.find(v => /egypt|hoda|salma|shakir/i.test(v.name));
    if (egVoice) return egVoice;

    // الأولوية 3: أي صوت عربي متاح
    return voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ar')) || null;
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => {
        getEgyptianArabicVoice();
    };
}

function speakArabicText(text, onEndCallback) {
    if (isMuted || !('speechSynthesis' in window)) {
        if (onEndCallback) setTimeout(onEndCallback, 5500);
        return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const chosenVoice = getEgyptianArabicVoice();
    if (chosenVoice) {
        utter.voice = chosenVoice;
        utter.lang = chosenVoice.lang;
    } else {
        utter.lang = 'ar-EG';
    }
    utter.rate = 0.96;
    utter.pitch = 1.05;

    let finished = false;
    const finishOnce = () => {
        if (!finished) {
            finished = true;
            if (onEndCallback) onEndCallback();
        }
    };

    utter.onend = () => {
        setTimeout(finishOnce, 900);
    };
    utter.onerror = () => {
        setTimeout(finishOnce, 4500);
    };

    window.speechSynthesis.speak(utter);
}

function renderVideoStep(stepIndex) {
    currentVideoStep = stepIndex;
    const scene = tutorialScenes[stepIndex];

    document.getElementById('vid-step-badge').textContent = scene.badge;
    document.getElementById('vid-caption-title').textContent = scene.title;
    document.getElementById('vid-caption-desc').textContent = scene.desc;

    const bat = document.getElementById('vid-battery');
    if (bat) bat.setAttribute('opacity', stepIndex >= 3 ? '1' : '0.35');

    const layer = document.getElementById('vid-scene-layer');
    if (layer) layer.innerHTML = scene.render();

    const cursor = document.getElementById('vid-cursor');
    if (cursor) {
        cursor.setAttribute('transform', `translate(${scene.cursor.x}, ${scene.cursor.y})`);
    }

    document.querySelectorAll('.timeline-dot').forEach((dot, idx) => {
        dot.classList.toggle('active', idx === stepIndex);
    });
}

function goToVideoStep(stepIndex) {
    playSound('pop');
    clearTimeout(videoTimer);
    renderVideoStep(stepIndex);
    if (isVideoPlaying) {
        speakArabicText(tutorialScenes[stepIndex].speech);
    }
}

function playCurrentSceneAndAdvance() {
    if (!isVideoPlaying) return;
    renderVideoStep(currentVideoStep);

    if (currentVideoStep === 4) playSound('success');
    else if (currentVideoStep === 5) playSound('buzz');
    else playSound('pop');

    speakArabicText(tutorialScenes[currentVideoStep].speech, () => {
        if (!isVideoPlaying) return;
        if (currentVideoStep < tutorialScenes.length - 1) {
            currentVideoStep++;
            playCurrentSceneAndAdvance();
        } else {
            stopTutorialTimer();
        }
    });
}

function startTutorialVideo() {
    isVideoPlaying = true;
    const playBtn = document.getElementById('vid-play-btn');
    if (playBtn) playBtn.innerHTML = '⏸️ وقّف الفيديو مؤقتاً';

    clearTimeout(videoTimer);
    playCurrentSceneAndAdvance();
}

function stopTutorialTimer() {
    isVideoPlaying = false;
    clearTimeout(videoTimer);
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    const playBtn = document.getElementById('vid-play-btn');
    if (playBtn) playBtn.innerHTML = '▶️ شغّل الفيديو بالصوت المصري';
}

function toggleTutorialPlay() {
    if (isVideoPlaying) {
        stopTutorialTimer();
    } else {
        if (currentVideoStep >= tutorialScenes.length - 1) {
            currentVideoStep = 0;
        }
        startTutorialVideo();
    }
}

function restartTutorialVideo() {
    stopTutorialTimer();
    currentVideoStep = 0;
    startTutorialVideo();
}

// تشغيل التهيئة الأولية عند فتح الصفحة
window.addEventListener('DOMContentLoaded', () => {
    renderVideoStep(0);
    updateKitchenUI();
    renderShape();
    loadQuizQuestion();
});
