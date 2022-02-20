const express = require('express')
const faunadb = require('faunadb'),
	q = faunadb.query

require('dotenv').config()

const client = new faunadb.Client({
	secret: process.env.FAUNA_SECRET
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
				q.Paginate(q.Documents(q.Collection('Question'))),
				q.Lambda('X', q.Get(q.Var('X')))
			)
		))

		res.status(200).json(questions)
	} catch(error) {
		res.status(500).json({error: error.description})
	}
})

// get questions by topic
app.get('/question_by_topic/:topic', async(req, res) => {
	const { topic } = req.params

	try {
		const questions = await(client.query(
			q.Map(
				q.Paginate(q.Match(q.Index('question_by_topic'), topic)),
				q.Lambda('question_ref', q.Get(q.Var('question_ref')))
			)
		))

		res.status(200).json(questions)
	} catch(error) {
		res.status(500).json({error: error.message})
	}
})

// retrieve single question
app.get('/questions/:id', async (req, res) => {
	try {
		const {data} = await client.query(
			q.Get(q.Ref(q.Collection('Question'), req.params.id))

		)

		res.status(200).json(data)
	} catch (error) {
		res.status(500).json({error: error.description})
	}
})

// create question
app.post('/questions', async (req, res) => {
	try {
		const {question, topic, illustrator} = req.body
		console.log(req.body)
		console.log(question)
		const {data} = await client.query(
			q.Create(q.Collection('Question'), {
				data: {question, topic, illustrator}
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

	// populated skills
	const { data: populated_skills } = await client.query(
		q.Paginate(
			q.Distinct(
				q.Match(q.Index('question_topics'))
			)
		)
	)

	res.status(201).json(skills.map(skill => {
		const skill_name = sanitized(skill.skill_name)
		return { 
			skill_name: skill_name, 
			populated: populated_skills.includes(skill_name) 
		}
	}))
})

// feature to delete questions one skill at a time
// need it to easily populate and delete questions when necessary
// delete all questions of particular topic
app.post('/delete', async (req, res) => {
	const { topic } = req.body

	if(topic === undefined) { return res.status(422).json({message: 'Please provide skill topic.'}) }

	try {
		// single query to delete all questions and answers
		const { data } = await client.query(
			q.Map(
				q.Paginate(q.Match(q.Index('question_by_topic'), topic), { size: 10000 }),
				q.Lambda('question_ref', 
					q.Let(
						{
							answer_refs: q.Paginate(
								q.Match(q.Index("answer_by_owner"),q.Var('question_ref'))
							)
						},
						{
							deleted_question: q.Delete(q.Var('question_ref')),
							deleted_answers: q.Map(q.Var('answer_refs'), q.Lambda('answer_ref', q.Delete(q.Var('answer_ref'))))
						}
					)
				)
			)
		)

		res.status(200).json({
			message: 'Successfully deleted',
			data: data
		})
	} catch(error) {
		console.log(error)

		res.status(500).json({
			message: error.message
		})
	}
})


app.post('/populate', async (req, res) => {
	// get topic of resource to populate
	console.log(req.body)
	const { topic } = req.body

	// fetch questions from skills asess api
	const response = await fetch(resource_url + topic)
	const questions = await response.json()

	try {
		questions.forEach(async (question) => {
			const createdQuestion = await client.query(
				q.Create(q.Collection('Question'), {
					data: {question: question.question, topic: topic, illustrator: illustrator}
				})
			)

			question.options.forEach(async (answer) => {
				await client.query(
					q.Create(q.Collection('Answer'), {
						data: {answer: answer.text, correct: answer.correct, owner: createdQuestion.ref}
					})
				)
			})
		})

		res.status(201).json({message: 'questions imported successfully'})
	} catch (error) {
		res.status(500).json({error: error.description})
	}
})

app.listen(PORT, () => console.log(`Listening at port ${PORT}`))


