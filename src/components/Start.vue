<template>
	<div class="app-container">
		<div class="content-container">
			<div v-if="currentStep === 'enqueteur'">
				<h2>Prénom enqueteur :</h2>
				<input class="form-control" type="text" v-model="enqueteur" />
				<button v-if="enqueteur" @click="setEnqueteur" class="btn-next">Suivant</button>
			</div>

			<div v-else-if="currentStep === 'start'">
				<button @click="startSurvey" class="btn-next">COMMENCER QUESTIONNAIRE</button>
			</div>

			<div v-if="currentStep === 'survey'">
				<div v-if="currentQuestion" class="question-container">
					<h2>{{ currentQuestion.text }}</h2>
					<div v-if="!currentQuestion.freeText">
						<div v-for="(option, index) in currentQuestion.options" :key="index">
							<button @click="selectAnswer(option)" class="btn-option">
								{{ option.text }}
							</button>
						</div>
					</div>
					<div v-else>
						<input v-model="freeTextAnswer" class="form-control" type="text"
							:placeholder="currentQuestion.freeTextPlaceholder || 'Votre réponse'" />
						<button @click="nextQuestion" class="btn-next" :disabled="!canProceed">Suivant</button>
					</div>
				</div>
				<button @click="previousQuestion" class="btn-return" v-if="canGoBack">Retour</button>
			</div>

			<img class="logo" src="../assets/Alycelogo.webp" alt="Logo Alyce">
		</div>

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

const docCount = ref(0);
const surveyCollectionRef = collection(db, "Vannes");
const currentStep = ref('enqueteur');
const startDate = ref('');
const enqueteur = ref('');
const currentQuestionIndex = ref(0);
const answers = ref({});
const freeTextAnswer = ref('');
const currentQuestion = computed(() => questions[currentQuestionIndex.value]);
const canGoBack = computed(() => questionPath.value.length > 1);
const questionPath = ref(['Q1']);
const isLastQuestion = computed(() => currentQuestionIndex.value === questions.length - 1);

const setEnqueteur = () => {
	if (enqueteur.value.trim() !== '') {
		currentStep.value = 'start';
	}
};

const selectAnswer = (option) => {
	if (currentQuestion.value.freeText) {
		// For free text questions, we don't immediately go to the next question
		answers.value[currentQuestion.value.id] = freeTextAnswer.value;
	} else {
		answers.value[currentQuestion.value.id] = option.text;
		nextQuestion();
	}
};

const nextQuestion = () => {
	if (currentQuestion.value.freeText) {
		answers.value[currentQuestion.value.id] = freeTextAnswer.value;
	}

	const nextQuestionId = currentQuestion.value.freeText
		? currentQuestion.value.next
		: currentQuestion.value.options.find(opt => opt.text === answers.value[currentQuestion.value.id])?.next;

	if (nextQuestionId === 'end') {
		submitSurvey();
	} else {
		const nextIndex = questions.findIndex(q => q.id === nextQuestionId);
		if (nextIndex !== -1) {
			currentQuestionIndex.value = nextIndex;
			questionPath.value.push(nextQuestionId);  // Add this line
			freeTextAnswer.value = ''; // Reset free text answer for the next question
		} else {
			console.error(`Next question with id ${nextQuestionId} not found`);
		}
	}
};

const previousQuestion = () => {
	if (canGoBack.value) {
		// Remove the current question from the path
		questionPath.value.pop();
		// Set the current question index to the last question in the path
		currentQuestionIndex.value = questions.findIndex(q => q.id === questionPath.value[questionPath.value.length - 1]);
		// Clear the answer for the current question
		delete answers.value[questions[currentQuestionIndex.value].id];
	}
};

const canProceed = computed(() => {
	if (currentQuestion.value.freeText) {
		return freeTextAnswer.value.trim() !== '';
	}
	return answers.value[currentQuestion.value.id] !== undefined;
});

const startSurvey = () => {
	startDate.value = new Date().toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' });
	currentStep.value = 'survey';
	currentQuestionIndex.value = 0;
	answers.value = {};
};

const getDocCount = async () => {
	try {
		const querySnapshot = await getDocs(surveyCollectionRef);
		docCount.value = querySnapshot.size;
	} catch (error) {
		console.error("Error getting document count:", error);
	}
};

const submitSurvey = async () => {
	const now = new Date();
	await addDoc(surveyCollectionRef, {
		HEURE_DEBUT: startDate.value,
		DATE: now.toLocaleDateString("fr-FR").replace(/\//g, "-"),
		JOUR: now.toLocaleDateString("fr-FR", { weekday: 'long' }),
		ENQUETEUR: enqueteur.value,
		HEURE_FIN: now.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
		...answers.value
	});
	currentStep.value = 'start';
	startDate.value = "";
	answers.value = {};
	currentQuestionIndex.value = 0;
	getDocCount();
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