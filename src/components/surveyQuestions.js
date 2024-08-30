export const questions = [
	{
		id: "Q1",
		text: "Quelle est la raison de votre présence en gare ?",
		options: [
			{ text: "Je vais prendre le train", next: "Q2" },
			{ text: "Je viens de descendre du train", next: "end" },
			{
				text: "J'accompagne des voyageurs qui partent / J'attends des voyageurs qui arrivent",
				next: "Q2",
			},
			{ text: "Autre raison (achat billet, commerces en gare...)", next: "Q2" },
		],
	},
	{
		id: "Q2",
		text: "Quelle est l'origine de votre déplacement ?       (D'où êtes-vous parti pour arriver à la gare ?)",
		options: [
			{ text: "Vannes", next: "Q2a" },
			{ text: "Autre commune", next: "Q2_precision", requiresPrecision: true },
		],
	},
	{
		id: "Q2_precision",
		text: "Préciser le nom de la commune :",
		freeText: true,
		next: "Q3",
	},
	{
		id: "Q2a",
		text: "De quelle rue de Vannes venez-vous ?",
		freeText: true,
		freeTextPlaceholder: "Nom de la rue",
		next: "Q3",
	},
	{
		id: "Q3",
		text: "Quel mode de transport avez-vous utilisé pour vous rendre à la gare ?",
		options: [
			{ text: "A pied", next: "Q4" },
			{
				text: "En voiture -- en tant que conducteur",
				next: "Q3a",
				requiresPrecision: true,
			},
			{
				text: "En voiture -- en tant que passager",
				next: "Q3b",
				requiresPrecision: true,
			},
			{ text: "En bus/car", next: "Q3c", requiresPrecision: true },
			{ text: "A vélo", next: "Q3d", requiresPrecision: true },
			{
				text: "A vélo à assistance électrique (VAE)",
				next: "Q3d",
				requiresPrecision: true,
			},
			{ text: "En trottinette", next: "Q3d", requiresPrecision: true },
			{ text: "En Taxi/VTC", next: "Q4" },
			{
				text: "En 2 roues Motorisé (Moto, scooter...)",
				next: "Q3a",
				requiresPrecision: true,
			},
			{ text: "En train - je fais une correspondance", next: "Q4" },
			{ text: "Autre", next: "Q3_autre", requiresPrecision: true },
		],
	},
	{
		id: "Q3a",
		text: "Où avez-vous stationné votre véhicule ?",
		options: [
			{ text: "Dans un parking courte durée au sud", next: "Q3a_prime" },
			{ text: "Dans le parking horodateur Ville au Nord", next: "Q3a_prime" },
			{
				text: "Dans le parking Bilaire à 1 km au Nord à proximité du centre d'entrainement du RCV",
				next: "Q3a_prime",
			},
			{
				text: "Sur une autre place en voirie au sud de la gare",
				next: "Q3a_prime",
			},
			{
				text: "Dans un autre parking au sud de la gare",
				next: "Q3a_precision_sud",
				requiresPrecision: true,
			},
			{
				text: "Sur une autre place en voirie au nord de la gare",
				next: "Q3a_prime",
			},
			{
				text: "Dans un autre parking au nord de la gare",
				next: "Q3a_precision_nord",
				requiresPrecision: true,
			},
			{
				text: "Sur un stationnement privé (box ou place de parking privée)",
				next: "Q3a_prime",
			},
		],
	},
	{
		id: "Q3a_precision_sud",
		text: "Préciser le nom du parking au sud de la gare :",
		freeText: true,
		next: "Q3a_prime",
	},
	{
		id: "Q3a_precision_nord",
		text: "Préciser le nom du parking au nord de la gare :",
		freeText: true,
		next: "Q3a_prime",
	},
	{
		id: "Q3a_prime",
		text: "Disposez-vous d'un abonnement ou d'un tarif préférentiel pour le stationnement ?",
		options: [
			{ text: "Oui", next: "Q3a_prime_precision", requiresPrecision: true },
			{ text: "Non", next: "Q4" },
		],
	},
	{
		id: "Q3a_prime_precision",
		text: "Préciser quel type d'abonnement ou de tarif préférentiel :",
		freeText: true,
		next: "Q4",
	},
	{
		id: "Q3b",
		text: "Où vous êtes-vous fait déposer ?",
		options: [
			{
				text: "Au niveau de la dépose-minute devant le bâtiment voyageur au sud",
				next: "Q4",
			},
			{ text: "Au niveau du parking courte durée au sud", next: "Q4" },
			{
				text: "Directement sur l'Avenue Favrel et Lincy devant la gare",
				next: "Q4",
			},
			{ text: "Au niveau du giratoire de la gare", next: "Q4" },
			{
				text: "Au niveau du giratoire Georges Cadoret devant l'hôpital Chubert",
				next: "Q4",
			},
			{ text: "Autre", next: "Q4", requiresPrecision: true },
		],
	},
	{
		id: "Q3c",
		text: "Quelle ligne de bus/car avez-vous emprunté ?",
		options: [
			{ text: "Ligne Kicéo 1", next: "Q4" },
			{ text: "Ligne Kicéo 4", next: "Q4" },
			{ text: "Ligne Kicéo 6a", next: "Q4" },
			{ text: "Ligne Kicéo 6b", next: "Q4" },
			{ text: "Ligne Kicéo 7", next: "Q4" },
			{ text: "Ligne Kicéo 8", next: "Q4" },
			{ text: "Ligne Kicéo 12", next: "Q4" },
			{ text: "Ligne Kicéo 20", next: "Q4" },
			{ text: "Ligne Kicéo 21", next: "Q4" },
			{ text: "Ligne Kicéo 22", next: "Q4" },
			{ text: "Ligne Kicéo 23", next: "Q4" },
			{ text: "Ligne Kicéo 24", next: "Q4" },
			{ text: "Ligne Kicéo 25", next: "Q4" },
			{ text: "Ligne BZ03", next: "Q4" },
			{ text: "Ligne BZ04", next: "Q4" },
			{ text: "Ligne BZ08", next: "Q4" },
			{ text: "Ligne BZ09", next: "Q4" },
			{ text: "Ligne BZ11", next: "Q4" },
			{ text: "Car scolaire", next: "Q4" },
			{ text: "Autre", next: "Q4", requiresPrecision: true },
		],
	},
	{
		id: "Q3d",
		text: "Où avez-vous stationné votre vélo/trottinette ?",
		options: [
			{
				text: "Sur les arceaux sur le parvis sud du bâtiment voyageur",
				next: "Q4",
			},
			{
				text: "Dans la consigne Korrigo du bâtiment multiservice au sud-est de la gare",
				next: "Q4",
			},
			{ text: "Je le transporte avec moi dans le train", next: "Q4" },
			{ text: "Autre", next: "Q4", requiresPrecision: true },
		],
	},
	{
		id: "Q3_autre",
		text: "Précisez le mode de transport utilisé :",
		freeText: true,
		next: "Q4",
	},
	{
		id: "Q4",
		text: "Possédez-vous un abonnement TER ?",
		options: [
			{ text: "Oui", next: "Q5" },
			{ text: "Non", next: "Q5" },
			{
				text: "Non mais j'envisage d'en prendre un dans les mois qui viennent",
				next: "Q5",
			},
		],
	},
	{
		id: "Q5",
		text: "Pour ce trajet en train, quelle sera votre gare de descente ?",
		freeText: true,
		freeTextPlaceholder: "Nom de la gare",
		next: "Q6",
	},
	{
		id: "Q6",
		text: "Quel est le motif de votre déplacement en train ?",
		options: [
			{ text: "Je me rends sur mon lieu de travail", next: "Q7" },
			{ text: "Je me rends sur mon lieu d'études", next: "Q7" },
			{ text: "Je rentre à mon domicile principal", next: "Q6a" },
			{ text: "Déplacement professionnel", next: "Q7" },
			{ text: "Loisirs, tourisme", next: "Q7" },
			{ text: "Autres", next: "Q6_precision", requiresPrecision: true },
		],
	},
	{
		id: "Q6_precision",
		text: "Veuillez préciser le motif de votre déplacement :",
		freeText: true,
		next: "Q7",
	},
	{
		id: "Q6a",
		text: "Quel était la raison de votre venue à Vannes ?",
		options: [
			{ text: "Mon lieu de travail se situe à Vannes", next: "Q7" },
			{ text: "Mon lieu d'études se situe à Vannes", next: "Q7" },
			{ text: "Je suis venu pour un déplacement professionnel", next: "Q7" },
			{ text: "Loisirs, tourisme", next: "Q7" },
			{ text: "Autres", next: "Q7", freeText: true },
		],
	},
	{
		id: "Q7",
		text: "A quelle fréquence réalisez-vous ce déplacement en train ?",
		options: [
			{
				text: "Tous les jours de la semaine ou presque (Plus de 3 fois par semaine)",
				next: "Q8",
			},
			{ text: "Régulièrement (au moins une fois par mois)", next: "Q8" },
			{ text: "Occasionnellement (moins d'une fois par mois)", next: "Q8" },
		],
	},
	{
		id: "Q8",
		text: "Quel âge avez-vous ?",
		options: [
			{ text: "Moins de 18 ans", next: "Q9" },
			{ text: "Entre 18 et 30 ans", next: "Q9" },
			{ text: "Entre 30 et 40 ans", next: "Q9" },
			{ text: "Entre 40 et 55 ans", next: "Q9" },
			{ text: "Entre 55 et 65 ans", next: "Q9" },
			{ text: "Plus de 65 ans", next: "Q9" },
		],
	},
	{
		id: "Q9",
		text: "Selon vous, que faudrait-il faire en priorité pour améliorer les conditions d'accès à cette gare ?",
		freeText: true,
		freeTextPlaceholder: "Votre réponse",
		next: "end",
	},
];

