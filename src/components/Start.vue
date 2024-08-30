<template>
	<div class="app-container">
		<!-- Progress Bar -->
		<div v-if="currentStep === 'survey'" class="progress-bar">
			<div class="progress" :style="{ width: `${progress}%` }"></div>
		</div>

		<div class="content-container">
			<!-- Enqueteur Input Step -->
			<div v-if="currentStep === 'enqueteur'">
				<h2>Prénom enqueteur :</h2>
				<input class="form-control" type="text" v-model="enqueteur" />
				<button v-if="enqueteur && !isEnqueteurSaved" @click="setEnqueteur" class="btn-next">Suivant</button>
			</div>

			<!-- Start Survey Step -->
			<div v-else-if="currentStep === 'start'">
				<button @click="startSurvey" class="btn-next">COMMENCER QUESTIONNAIRE</button>
			</div>

			<!-- Survey Questions Step -->
			<div v-else-if="currentStep === 'survey' && !isSurveyComplete">
				<div class="question-container">
					<h2>{{ currentQuestion.text }}</h2>
					<!-- Multiple Choice Questions -->
					<div v-if="!currentQuestion.freeText">
						<div v-for="(option, index) in currentQuestion.options" :key="index">
							<button @click="selectAnswer(option)" class="btn-option">
								{{ option.text }}
							</button>
						</div>
					</div>
					<!-- Free Text Questions -->
					<div v-else>
						<input v-model="freeTextAnswer" class="form-control" type="text"
							:placeholder="currentQuestion.freeTextPlaceholder || 'Votre réponse'" />
						<button @click="handleFreeTextAnswer" class="btn-next" :disabled="!freeTextAnswer.trim()">
							{{ isLastQuestion ? 'Terminer' : 'Suivant' }}
						</button>
					</div>
					<!-- Back Button -->
					<button @click="previousQuestion" class="btn-return" v-if="canGoBack">Retour</button>
				</div>
			</div>

			<!-- Survey Complete Step -->
			<div v-else-if="isSurveyComplete" class="survey-complete">
				<h2>Merci pour votre réponse et bon voyage.</h2>
				<button @click="resetSurvey" class="btn-next">Nouveau questionnaire</button>
			</div>

			<!-- Logo -->
			<img class="logo" src="../assets/Alycelogo.webp" alt="Logo Alyce">
		</div>

		<!-- Footer -->
		<div class="footer">
			<button class="btn-download" @click="downloadData">Download DATA</button>
			<div class="doc-count">Nombre de questionnaires : {{ docCount }}</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { questions } from './surveyQuestions.js';

// Reactive variables
const docCount = ref(0);
const surveyCollectionRef = collection(db, "Vannes");
const currentStep = ref('enqueteur');
const startDate = ref('');
const enqueteur = ref('');
const currentQuestionIndex = ref(0);
const answers = ref({});
const freeTextAnswer = ref('');
const questionPath = ref(['Q1']);
const isEnqueteurSaved = ref(false);
const isSurveyComplete = ref(false);

// Computed properties
const currentQuestion = computed(() => questions[currentQuestionIndex.value]);
const canGoBack = computed(() => questionPath.value.length > 1);
const isLastQuestion = computed(() => currentQuestionIndex.value === questions.length - 1);

// Progress Bar
const progress = computed(() => {
	if (currentStep.value !== 'survey') return 0;
	if (isSurveyComplete.value) return 100;

	const totalQuestions = questions.length;
	const currentQuestionNumber = currentQuestionIndex.value + 1;

	// Check if the current question is the last one or if it leads to the end
	const isLastOrEnding = isLastQuestion.value ||
		(currentQuestion.value.options &&
			currentQuestion.value.options.some(option => option.next === 'end'));

	if (isLastOrEnding) {
		return 100;
	}

	return Math.min(Math.round((currentQuestionNumber / totalQuestions) * 100), 99);
});

// Methods
const setEnqueteur = () => {
	if (enqueteur.value.trim() !== '') {
		currentStep.value = 'start';
		isEnqueteurSaved.value = true;
	}
};

const startSurvey = () => {
	startDate.value = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	currentStep.value = 'survey';
	currentQuestionIndex.value = 0;
	answers.value = {};
	isSurveyComplete.value = false;
};

const selectAnswer = (option) => {
	answers.value[currentQuestion.value.id] = option.text;
	if (option.next === 'end') {
		finishSurvey();
	} else if (option.requiresPrecision) {
		nextQuestion(option.next);
	} else {
		nextQuestion();
	}
};

const handleFreeTextAnswer = () => {
	answers.value[currentQuestion.value.id] = freeTextAnswer.value;
	if (currentQuestionIndex.value < questions.length - 1) {
		nextQuestion();
	} else {
		finishSurvey();
	}
};

const nextQuestion = (forcedNextId = null) => {
	let nextQuestionId = forcedNextId;
	if (!nextQuestionId) {
		nextQuestionId = currentQuestion.value.next;
		if (!currentQuestion.value.freeText) {
			const selectedOption = currentQuestion.value.options.find(opt => opt.text === answers.value[currentQuestion.value.id]);
			nextQuestionId = selectedOption ? selectedOption.next : null;
		}
	}

	if (nextQuestionId === 'end') {
		finishSurvey();
	} else if (nextQuestionId) {
		const nextIndex = questions.findIndex(q => q.id === nextQuestionId);
		if (nextIndex !== -1) {
			currentQuestionIndex.value = nextIndex;
			questionPath.value.push(nextQuestionId);
			freeTextAnswer.value = '';
		} else {
			console.error(`Next question with id ${nextQuestionId} not found`);
		}
	} else {
		console.error('No next question defined');
	}
};

const previousQuestion = () => {
	if (canGoBack.value) {
		questionPath.value.pop();
		const previousQuestionId = questionPath.value[questionPath.value.length - 1];
		const previousIndex = questions.findIndex(q => q.id === previousQuestionId);
		if (previousIndex !== -1) {
			currentQuestionIndex.value = previousIndex;
			delete answers.value[questions[currentQuestionIndex.value].id];
			freeTextAnswer.value = '';
		} else {
			console.error(`Previous question with id ${previousQuestionId} not found`);
		}
	}
};

const finishSurvey = async () => {
	isSurveyComplete.value = true;
	const now = new Date();
	await addDoc(surveyCollectionRef, {
		HEURE_DEBUT: startDate.value,
		DATE: now.toLocaleDateString("fr-FR").replace(/\//g, "-"),
		JOUR: now.toLocaleDateString("fr-FR", { weekday: 'long' }),
		ENQUETEUR: enqueteur.value,
		HEURE_FIN: now.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
		...answers.value
	});

	await getDocCount();
};

const resetSurvey = () => {
	currentStep.value = 'start';
	startDate.value = "";
	answers.value = {};
	currentQuestionIndex.value = 0;
	questionPath.value = ['Q1'];
	freeTextAnswer.value = '';
	isSurveyComplete.value = false;
};

const getDocCount = async () => {
	try {
		const querySnapshot = await getDocs(surveyCollectionRef);
		docCount.value = querySnapshot.size;
	} catch (error) {
		console.error("Error getting document count:", error);
	}
};

const downloadData = async () => {
	try {
		const querySnapshot = await getDocs(surveyCollectionRef);
		const headers = {
			ID_questionnaire: "ID_questionnaire",
			ENQUETEUR: "ENQUETEUR",
			DATE: "DATE",
			JOUR: "JOUR",
			HEURE_DEBUT: "HEURE_DEBUT",
			HEURE_FIN: "HEURE_FIN",
			...Object.fromEntries(questions.map(q => [q.id, q.text]))
		};

		const data = querySnapshot.docs.map(doc => ({
			ID_questionnaire: doc.id,
			...Object.fromEntries(
				Object.keys(headers).map(key => [key, doc.data()[key] || ""])
			)
		}));

		const worksheet = XLSX.utils.json_to_sheet(data, { header: Object.keys(headers) });
		const maxWidths = Object.keys(headers).reduce((acc, key) => {
			acc[key] = Math.max(headers[key].length, ...data.map(row => (row[key] || "").toString().length)) + 2;
			return acc;
		}, {});

		worksheet['!cols'] = Object.values(maxWidths).map(width => ({ wch: width }));

		const workbook = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
		XLSX.writeFile(workbook, "Vannes.xlsx");
	} catch (error) {
		console.error("Error downloading data: ", error);
	}
};

onMounted(() => {
	getDocCount();
});
</script>


<style>
/* Base styles */
body {
	background-color: #2a3b63;
	margin: 0;
	padding: 0;
	font-family: Arial, sans-serif;
}

.app-container {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: #2a3b63;
	color: white;
}

.content-container {
	flex-grow: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 5% 20px;
	width: 100%;
	max-width: 800px;
	margin: 0 auto;
	box-sizing: border-box;
}

.question-container {
	width: 100%;
	margin-bottom: 30px;
	/* Add space below the question and options */
}


h2 {
	color: white;
	font-size: 1.2rem;
	margin-bottom: 15px;
	text-align: center;
}

.form-control {
	width: 100%;
	max-width: 400px;
	padding: 10px;
	border-radius: 5px;
	border: 1px solid white;
	background-color: #333;
	color: white;
	font-size: 16px;
	margin-bottom: 15px;
}

.btn-next,
.btn-return,
.btn-option {
	width: 100%;
	max-width: 400px;
	color: white;
	background-color: grey;
	padding: 15px;
	margin-top: 10px;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
}

.btn-next {
	background-color: green;
}

.btn-return {
	margin-top: 30px;
	/* Increased space above the Return button */
}

.logo {
	max-width: 20%;
	height: auto;
	margin-top: 40px;
	/* Increased space above the logo */
	margin-bottom: 20px;
}

.btn-option {
	background-color: #4a5a83;
	text-align: left;
}

.footer {
	background: linear-gradient(to right, #4c4faf, #3f51b5);
	padding: 20px;
	text-align: center;
	width: 100%;
	box-sizing: border-box;
}

.btn-download {
	background-color: #ffffff;
	color: #4c4faf;
	border: none;
	cursor: pointer;
	font-size: 16px;
	font-weight: bold;
	padding: 10px 20px;
	border-radius: 25px;
	transition: all 0.3s ease;
	margin-bottom: 15px;
	text-transform: uppercase;
	letter-spacing: 1px;
}

.doc-count {
	font-size: 14px;
	opacity: 0.9;
}

.progress-bar {
	width: 100%;
	height: 10px;
	background-color: #e0e0e0;
	position: relative;
	overflow: hidden;
}

.progress {
	height: 100%;
	background-color: #4caf50;
	transition: width 0.3s ease-in-out;
}

@media screen and (max-width: 768px) {
	.question-container {
		margin-bottom: 20px;
		/* Slightly less space on smaller screens */
	}

	.btn-return {
		margin-top: 20px;
	}

	.logo {
		margin-top: 30px;
	}
}

@media screen and (max-width: 480px) {
	.question-container {
		margin-bottom: 15px;
		/* Even less space on very small screens */
	}

	.btn-return {
		margin-top: 15px;
	}

	.logo {
		margin-top: 25px;
	}
}
</style>