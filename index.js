const express = require('express')
const faunadb = require('faunadb'),
	q = faunadb.query

const client = new faunadb.Client({
	secret: 'fnAEcRVGlrACScAzR_KZBnX-5ntIR6EGcES2dVnT'
})

const fetch = require('node-fetch')

const { sanitized } = require('./lib/utils')

const resource_url = 'https://skill-assess-api.vercel.app/api/questions/'

const app = express()
app.use(express.json())
const PORT = process.env.PORt || 8000

app.get('/', async(req, res) => {
	try {
		res.status(200).json({"message": "Welcome"})
		console.log('Welcome')
	} catch (error) {
		console.log(error)
		res.status(500).json({"message": "There appears to be an error!!!"})
	}
})


// get all questions
app.get('/questions', async(req, res) => {
	try {
		let questions = await(client.query(
			q.Map(
				q.Paginate(q.Documents(q.Collection('questions'))),
				q.Lambda('X', q.Get(q.Var('X')))
			)
		))

		res.status(200).json(questions)
	} catch(error) {
		res.status(500).json({error: error.description})
	}
})

// retrieve single question
app.get('/questions/:id', async (req, res) => {
	try {
		const {data} = await client.query(
			q.Get(q.Ref(q.Collection('questions'), req.params.id))

		)

		res.status(200).json(data)
	} catch (error) {
		res.status(500).json({error: error.description})
	}
})

// create question
app.post('/questions', async (req, res) => {
	try {
		const {question, topic} = req.body
		console.log(req.body)
		console.log(question)
		const {data} = await client.query(
			q.Create(q.Collection('Question'), {
				data: {question, topic}
			})
		)

		res.status(201).json(data)
	} catch (error) {
		res.status(500).json({error: error.description})
	}
})

// get list of all skills
app.get('/skills', async (req, res) => {
	const response = await fetch(resource_url + 'skills')
	const skills = await response.json()

	

	res.status(201).json(skills.map(skill => {
		return { skill_name: sanitized(skill.skill_name) }
	}))
})

// feature to delete questions one skill at a time
app.post('/delete', async (req, res) => {
	const { skill } = req.body

	if(skill === undefined) { return res.status(422).json({message: 'Please provide skill name.'}) }

	const questions = q.Map(
		q.Match(Index('question_by_topic'), skill)
	)
})


app.post('/populate', async (req, res) => {
	// get topic of resource to populate
	console.log(req.body)
	const { topic } = req.body

	// fetch questions from skills asess api
	const response = await fetch(resource_url + topic)
	const questions = await response.json()


	// console.log(questions)

	// const createdQuestion = await client.query(
	// 	q.Create(q.Collection('Question'), {
	// 		data: {question: questions[0].question}
	// 	})
	// )

	// console.log(createdQuestion.ref.id)

	try {
		questions.forEach(async (question) => {
			const createdQuestion = await client.query(
				q.Create(q.Collection('Question'), {
					data: {question: question.question, topic: topic}
				})
			)

			question.options.forEach((answer) => {
				client.query(
					q.Create(q.Collection('Answer'), {
						data: {answer: answer.text, correct: answer.correct, owner: {connect: createdQuestion.ref.id}}
					})
				)
			})
		})

		res.status(201).json({message: 'questions imported successfully'})
	} catch (error) {
		res.status(500).json({error: error.description})
	}
})

// need it to easily populate and delete questions when necessary
// delete all questions of particular topic




app.listen(PORT, () => console.log(`Listening at port ${PORT}`))


