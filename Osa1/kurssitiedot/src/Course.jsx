const Header = ({ courseName }) => {
    return <h1>{courseName}</h1>
  }
  
  const Part = ({ name, exercises }) => {
    return <p>{name} {exercises}</p>
  }
  
  const Content = ({ parts }) => {
    return (
      <div>
        {parts.map((part, index) => (
          <Part key={index} name={part.name} exercises={part.exercises} />
        ))}
      </div>
    )
  }
  
  const Total = ({ parts }) => {
    const totalExercises = parts.reduce((sum, part) => sum + part.exercises, 0)
    return <p>Number of exercises {totalExercises}</p>
  }
  
  const Course = ({ course }) => {
    return (
      <div>
        <Header courseName={course.name} />
        <Content parts={course.parts} />
        <Total parts={course.parts} />
      </div>
    )
  }
  
  export default Course
  