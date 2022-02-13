const express = require('express')
const faunadb = require('faunadb'),
	q = faunadb.query

const client = new faunadb.Client({
	secret: 'fnAEcRVGlrACScAzR_KZBnX-5ntIR6EGcES2dVnT'
})

const fetch = require('node-fetch')

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
		const {question} = req.body
		console.log(req.body)
		console.log(question)
		const {data} = await client.query(
			q.Create(q.Collection('questions'), {
				data: {question}
			})
		)

		res.status(201).json(data)
	} catch (error) {
		res.status(500).json({error: error.description})
	}
})


app.get('/populate', async (req, res) => {
	// fetch questions from skills asess api
	const response = await fetch('https://skill-assess-api.vercel.app/api/questions/rubi-on-rails')
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
					data: {question: question.question}
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


