import { useState } from 'react'

const Button = ({ onClick, text }) => {
  return <button onClick={onClick}>{text}</button>
}

const App = () => {
  const anecdotes = [
    'If it hurts, do it more often.',
    'Adding manpower to a late software project makes it later!',
    'The first 90 percent of the code accounts for the first 90 percent of the development time...The remaining 10 percent of the code accounts for the other 90 percent of the development time.',
    'Any fool can write code that a computer can understand. Good programmers write code that humans can understand.',
    'Premature optimization is the root of all evil.',
    'Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.',
    'Programming without an extremely heavy use of console.log is same as if a doctor would refuse to use x-rays or blood tests when dianosing patients.',
    'The only way to go fast, is to go well.'
  ]

  const [selected, setSelected] = useState(0)
  const [votes, setVotes] = useState(new Array(anecdotes.length).fill(0))

  const handleVote = () => {
    const newVotes = [...votes]
    newVotes[selected] += 1
    setVotes(newVotes)
  }

  const getMostVotedIndex = () => {
    return votes.indexOf(Math.max(...votes))
  }

  const mostVoted = getMostVotedIndex()

  return (
    <div>
      <h2>Anecdote of the day</h2>
      <p>{anecdotes[selected]}</p>
      <p>Has {votes[selected]} votes</p>
      <Button onClick={handleVote} text="Vote" />
      <Button onClick={() => setSelected(Math.floor(Math.random() * anecdotes.length))} text="Next Anecdote" />

      <h2>Anecdote with most votes</h2>
      {votes[mostVoted] > 0 ? (
        <div>
          <p>{anecdotes[mostVoted]}</p>
          <p>Has {votes[mostVoted]} votes</p>
        </div>
      ) : (
        <p>No votes yet</p>
      )}
    </div>
  )
}

export default App
