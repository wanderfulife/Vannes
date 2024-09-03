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
			<div v-else-if="currentStep === 'start'" class="start-survey-container">
				<h2>Bonjour,<br> pour mieux connaître les usagers de la gare de Vannes, GMVA et la SNCF souhaiteraient
					en savoir plus sur votre déplacement en cours.<br> Auriez-vous quelques secondes à nous accorder ?
				</h2>
				<button @click="startSurvey" class="btn-next">COMMENCER QUESTIONNAIRE</button>
			</div>

			<!-- Survey Questions Step -->
			<div v-else-if="currentStep === 'survey' && !isSurveyComplete">
				<div class="question-container">
					<h2>{{ currentQuestion.text }}</h2>

					<!-- PDF Button for Q3a and Q3a_nonvoyageur -->
					<button v-if="['Q3a', 'Q3a_nonvoyageur'].includes(currentQuestion.id)" @click="showPdf = true"
						class="btn-pdf">
						Voir le plan du parking
					</button>

					<!-- Commune Selector for Q2 -->
					<div v-if="currentQuestion.id === 'Q2' || currentQuestion.id === 'Q2_nonvoyageur'">
						<div v-for="(option, index) in currentQuestion.options" :key="index">
							<button @click="selectAnswer(option, index)" class="btn-option">
								{{ option.text }}
							</button>
						</div>
					</div>
					<div
						v-else-if="currentQuestion.id === 'Q2_precision' || currentQuestion.id === 'Q2_precision_nonvoyageur'">
						<CommuneSelector v-model="selectedCommune" v-model:postalCodePrefix="postalCodePrefix" />
						<p>Commune sélectionnée ou saisie: {{ selectedCommune }}</p>
						<button @click="handleCommuneSelection" class="btn-next" :disabled="!selectedCommune.trim()">
							{{ isLastQuestion ? 'Terminer' : 'Suivant' }}
						</button>
					</div>
					<!-- Dropdown for Q5 -->
					<div v-else-if="currentQuestion.id === 'Q5'">
						<div class="station-input-container">
							<input v-model="stationInput" class="form-control" type="text"
								placeholder="Saisissez une gare" />
							<ul v-if="showFilteredStations" class="commune-dropdown">
								<li v-for="station in filteredStations" :key="station" @click="selectStation(station)"
									class="commune-option">
									{{ station }}
								</li>
							</ul>
						</div>
						<button @click="handleStationSelection" class="btn-next" :disabled="!stationInput.trim()">
							{{ isLastQuestion ? 'Terminer' : 'Suivant' }}
						</button>
					</div>
					<!-- Multiple Choice Questions -->
					<div v-else-if="!currentQuestion.freeText">
						<div v-for="(option, index) in currentQuestion.options" :key="index">
							<button @click="selectAnswer(option, index)" class="btn-option">
								{{ option.text }}
							</button>
						</div>
					</div>
					<!-- Free Text Questions -->
					<div v-else>
						<div class="input-container">
							<input v-model="freeTextAnswer" class="form-control" type="text"
								:placeholder="currentQuestion.freeTextPlaceholder || 'Votre réponse'" />
						</div>
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
				<h2>Merci pour votre réponse et bonne journée.</h2>
				<button @click="resetSurvey" class="btn-next">Nouveau questionnaire</button>
			</div>

			<!-- Logo -->
			<img class="logo" src="../assets/Alycelogo.webp" alt="Logo Alyce">
		</div>

		<!-- Footer -->
		<div class="footer">
			<AdminDashboard />
			<div class="doc-count">Nombre de questionnaires : {{ docCount }}</div>
		</div>

		<!-- PDF Modal -->
		<div v-if="showPdf" class="modal">
			<div class="modal-content pdf-content">
				<span class="close" @click="showPdf = false">&times;</span>
				<iframe :src="pdfUrl" width="100%" height="500px" type="application/pdf">
					This browser does not support PDFs. Please download the PDF to view it.
				</iframe>
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { db } from "../firebaseConfig";
import { collection, getDocs, addDoc } from "firebase/firestore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { questions } from './surveyQuestions.js';
import CommuneSelector from './CommuneSelector.vue';
import AdminDashboard from './AdminDashboard.vue';


// Refs
const docCount = ref(0);
const currentStep = ref('enqueteur');
const startDate = ref('');
const enqueteur = ref('');
const currentQuestionIndex = ref(0);
const answers = ref({});
const freeTextAnswer = ref('');
const questionPath = ref(['Q1']);
const isEnqueteurSaved = ref(false);
const isSurveyComplete = ref(false);
const selectedStation = ref('');
const selectedCommune = ref('');
const postalCodePrefix = ref('');
const showPdf = ref(false);
const pdfUrl = ref('/Plan.pdf');
const stationInput = ref('');
const filteredStations = ref([]);

// Firestore refs
const surveyCollectionRef = collection(db, "Vannes");
const counterDocRef = doc(db, "counters", "surveyCounter");

// Stations list
const stationsList = [
	'Brest', 'Kerhuon', 'La Forest-Landerneau', 'Landerneau', 'Dirinon',
	'Pont-de-Buis', 'Châteaulin', 'Quimper', 'Rosporden', 'Bannalec',
	'Quimperlé', 'Gestel', 'Lorient', 'Hennebont', 'Brandérion',
	'Landévant', 'Landaul – Mendon', 'Auray', 'Sainte-Anne',
	'Questembert', 'Malansac', 'Redon', 'Séverac', 'Saint-Gildas-des-Bois',
	'Drefféac', 'Pontchâteau', 'Savenay', 'Cordemais', 'Saint-Etienne-de-Montluc',
	'Couëron', 'Basse Indre – Saint-Herblain', 'Chantenay', 'Nantes', 'Masserac',
	'Beslé', 'Fougeray-Langon', 'Messac-Guipry', 'Pléchâtel', 'Saint-Senoux-Pléchâtel',
	'Guichen-Bourg-des-Comptes', 'Laillé', 'Bruz', 'Ker Lann', 'Saint-Jacques-de-la-Lande',
	'Rennes', 'Laval', 'Le Mans', 'Massy TGV', 'Paris Montparnasse'
];

// Computed properties
const currentQuestion = computed(() => {
	return currentQuestionIndex.value >= 0 && currentQuestionIndex.value < questions.length
		? questions[currentQuestionIndex.value]
		: null;
});

const showFilteredStations = computed(() => stationInput.value.length > 0 && filteredStations.value.length > 0);

const canGoBack = computed(() => questionPath.value.length > 1);

const isLastQuestion = computed(() => currentQuestionIndex.value === questions.length - 1);

const progress = computed(() => {
	if (currentStep.value !== 'survey') return 0;
	if (isSurveyComplete.value) return 100;
	const totalQuestions = questions.length;
	const currentQuestionNumber = currentQuestionIndex.value + 1;
	const isLastOrEnding = isLastQuestion.value ||
		(currentQuestion.value?.options?.some(option => option.next === 'end'));
	return isLastOrEnding ? 100 : Math.min(Math.round((currentQuestionNumber / totalQuestions) * 100), 99);
});

const isValidCommuneSelection = computed(() => {
	return selectedCommune.value.includes(' - ') || selectedCommune.value.trim() !== '';
});

// Add these new methods
const filterStations = () => {
	const input = stationInput.value.toLowerCase();
	filteredStations.value = stationsList.filter(station =>
		station.toLowerCase().includes(input)
	);
};

const selectStation = (station) => {
	stationInput.value = station;
	filteredStations.value = [];
};

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

const selectAnswer = (option, index) => {
	if (currentQuestion.value) {
		answers.value[currentQuestion.value.id] = index + 1;

		// Special handling for Q1
		if (currentQuestion.value.id === 'Q1') {
			if (index === 1) { // "Je viens de descendre du train"
				finishSurvey();
				return;
			}
		}

		// Special handling for Q2 and Q2_nonvoyageur
		if (currentQuestion.value.id === 'Q2' || currentQuestion.value.id === 'Q2_nonvoyageur') {
			if (index === 0) {
				// "Vannes" selected
				const questionPrefix = currentQuestion.value.id === 'Q2' ? 'Q2' : 'Q2_nonvoyageur';
				answers.value[`${questionPrefix}_COMMUNE`] = 'Vannes';
				answers.value['CODE_INSEE'] = '56260'; // INSEE code for Vannes
				answers.value['COMMUNE_LIBRE'] = '';
			}
		}

		if (option.next === 'end') {
			finishSurvey();
		} else if (option.requiresPrecision) {
			nextQuestion(option.next);
		} else {
			nextQuestion();
		}
	}
};

const handleFreeTextAnswer = () => {
	if (currentQuestion.value) {
		answers.value[currentQuestion.value.id] = freeTextAnswer.value;
		if (currentQuestionIndex.value < questions.length - 1) {
			nextQuestion();
		} else {
			finishSurvey();
		}
	}
};

const handleStationSelection = () => {
	if (stationInput.value.trim() !== '') {
		const isListedStation = stationsList.includes(stationInput.value);
		answers.value['Q5'] = stationInput.value;
		if (!isListedStation) {
			answers.value['Q5_CUSTOM'] = stationInput.value;
		}
		nextQuestion();
		stationInput.value = ''; // Reset input for next use
		filteredStations.value = []; // Clear filtered list
	}
};

// Add this watch
watch(stationInput, () => {
	filterStations();
});

const updateSelectedCommune = (value) => {
	selectedCommune.value = value;
};


const handleCommuneSelection = () => {
	if (selectedCommune.value.trim() !== '') {
		const parts = selectedCommune.value.split(' - ');
		const currentQuestionId = currentQuestion.value.id;
		const isNonPassenger = currentQuestionId.includes('nonvoyageur');
		const questionPrefix = isNonPassenger ? 'Q2_nonvoyageur' : 'Q2';

		if (parts.length === 2) {
			// Dropdown selection
			const [commune, codeInsee] = parts;
			answers.value[`${questionPrefix}_COMMUNE`] = commune;
			answers.value['CODE_INSEE'] = codeInsee;
			answers.value['COMMUNE_LIBRE'] = ''; // Clear COMMUNE_LIBRE
		} else {
			// Manual entry or free text
			answers.value[`${questionPrefix}_COMMUNE`] = ''; // Clear the dropdown commune
			answers.value['CODE_INSEE'] = ''; // Clear INSEE code
			answers.value['COMMUNE_LIBRE'] = selectedCommune.value.trim(); // Set COMMUNE_LIBRE
		}
		nextQuestion();
	}
};



const nextQuestion = (forcedNextId = null) => {
	let nextQuestionId = forcedNextId;
	if (!nextQuestionId && currentQuestion.value) {
		nextQuestionId = currentQuestion.value.next;
		if (!currentQuestion.value.freeText) {
			const selectedAnswer = answers.value[currentQuestion.value.id];
			const selectedOption = currentQuestion.value.options[selectedAnswer - 1];
			nextQuestionId = selectedOption?.next || null;
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
			selectedCommune.value = '';
			postalCodePrefix.value = '';
		}
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
		}
	}
};

const finishSurvey = async () => {
	isSurveyComplete.value = true;
	const now = new Date();
	const uniqueId = await getNextId();

	// Determine if it's a passenger or non-passenger survey
	const isPassenger = answers.value['Q1'] === 1;
	const questionPrefix = isPassenger ? 'Q2' : 'Q2_nonvoyageur';

	await addDoc(surveyCollectionRef, {
		ID_questionnaire: uniqueId,
		HEURE_DEBUT: startDate.value,
		DATE: now.toLocaleDateString("fr-FR").replace(/\//g, "-"),
		JOUR: now.toLocaleDateString("fr-FR", { weekday: 'long' }),
		ENQUETEUR: enqueteur.value,
		HEURE_FIN: now.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
		TYPE_QUESTIONNAIRE: isPassenger ? 'Passager' : 'Non-passager',
		[`${questionPrefix}_COMMUNE`]: answers.value[`${questionPrefix}_COMMUNE`] || '',
		CODE_INSEE: answers.value['CODE_INSEE'] || '',
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

const getNextId = async () => {
	const counterDoc = await getDoc(counterDocRef);
	let counter = 1;

	if (counterDoc.exists()) {
		counter = counterDoc.data().value + 1;
	}

	await setDoc(counterDocRef, { value: counter });

	return `VANNES-${counter.toString().padStart(6, '0')}`;
};


// Lifecycle hooks
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

/* Center the Start Survey button horizontally and vertically */
.start-survey-container {
	justify-content: center;
	/* Center horizontally */
	align-items: center;
	/* Center vertically */
	height: 50vh;
	/* Full viewport height */
	width: 100%;
	/* Full width */
	margin-bottom: 5%;
}

.content-container {
	flex-grow: 1;
	/* This allows the content to take up available space */
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 5% 0;
	width: 90%;
	max-width: 600px;
	margin: 0 auto;
	box-sizing: border-box;
	overflow-y: auto;
	/* Allow scrolling if content overflows */
}

.question-container {
	width: 100%;
	margin-bottom: 30px;
}

.input-container {
	display: flex;
	justify-content: center;
	/* Center horizontally */
	width: 100%;
	/* Take full width of the parent */
}

h2 {
	text-align: center;
	width: 100%;
}

.form-control {
	width: 100%;
	max-width: 400px;
	/* Maximum width of the input */
	padding: 10px;
	border-radius: 5px;
	border: 1px solid white;
	background-color: #333;
	color: white;
	font-size: 16px;
	margin-bottom: 15px;
	box-sizing: border-box;
	outline: none;
}

.btn-next,
.btn-return,
.btn-option {
	width: 100%;
	max-width: 400px;
	color: white;
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
	background-color: grey;
	margin-top: 30px;
}

.btn-option {
	background-color: #4a5a83;
	text-align: left;
}

.logo {
	max-width: 25%;
	height: auto;
	margin-top: 40px;
	margin-bottom: 20px;
}

.footer {
	background: linear-gradient(to right, #4c4faf, #3f51b5);
	padding: 20px;
	text-align: center;
	width: 100%;
	box-sizing: border-box;
	position: relative;
	/* Keep the footer relative to its parent */
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
	margin-bottom: 20px;
}

.progress {
	height: 100%;
	background-color: #4caf50;
	transition: width 0.3s ease-in-out;
}

.commune-dropdown {
	max-height: 200px;
	overflow-y: auto;
	border: 1px solid #ccc;
}

.commune-option {
	padding: 5px;
	cursor: pointer;
}

.commune-option:hover {
	background-color: #f0f0f0;
}

@media screen and (max-width: 768px) {
	.question-container {
		margin-bottom: 20px;
	}

	.btn-return {
		margin-top: 20px;
	}

	.logo {
		margin-top: 30px;
	}
}

/* Ensure responsive centering */
@media screen and (max-width: 480px) {
	.form-control {
		max-width: 100%;
		/* Ensure full width on small screens */
	}
}
.btn-pdf {
	background-color: #ff9800;
	/* Orange color to make it distinct */
	color: white;
	padding: 15px;
	margin: 10px 0;
	border: none;
	border-radius: 5px;
	cursor: pointer;
	font-size: 16px;
	width: 100%;
	max-width: 400px;
	text-align: center;
	transition: background-color 0.3s;
}

.btn-pdf:hover {
	background-color: #f57c00;
	/* Darker orange on hover */
}

.modal {
	display: flex;
	position: fixed;
	z-index: 1;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	overflow: auto;
	background-color: rgba(0, 0, 0, 0.4);
	justify-content: center;
	align-items: center;
}

.modal-content {
	background-color: #fefefe;
	padding: 20px;
	border: 1px solid #888;
	width: 90%;
	max-width: 800px;
	position: relative;
}

.pdf-content {
	height: 80vh;
	display: flex;
	flex-direction: column;
}

.close {
	color: #aaa;
	float: right;
	font-size: 28px;
	font-weight: bold;
	cursor: pointer;
	position: absolute;
	right: 10px;
	top: 5px;
}

.close:hover,
.close:focus {
	color: black;
	text-decoration: none;
	cursor: pointer;
}

/* Ensure the PDF fits within the modal */
.pdf-content iframe {
	flex-grow: 1;
	border: none;
	margin-top: 20px;
}
</style>