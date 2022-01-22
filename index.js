const express = require('express')
const faunadb = require('faunadb'),
	q = faunadb.query

const client = new faunadb.Client({
	secret: 'fnAEcRVGlrACScAzR_KZBnX-5ntIR6EGcES2dVnT'
})

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


app.listen(PORT, () => console.log(`Listening at port ${PORT}`))


