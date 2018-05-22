import React from 'react'
import DrawingBoardCmp from './DrawingBoardCmp'
import { Requests } from '../api/requests'
import { LessonPlans } from '../api/lessonplans'
import SimsList from './SimsList'
import List from './List'
import AddSim from './AddSim'
import { Link } from 'react-router-dom'


export default class CreateLessonPlan extends React.Component {

    constructor(props) {

        /* This Component is intended for the creation of a lessonplan.
           The teachers can create slides. On each slides, there will be
           note and array of simulations. The changes need to be saved explicitly
           by clicking the save button for updating the database.

           currSlide is for keeping track of the current slide, Each element in slides
           will consist the note and the array of iframe srcs. _id will carry the id of
           the current lessonplan.
        */

        super(props);

        this.isInteractEnabled=false;
        this.undoArray= [];
        this.curPosition= [];

        this.state = {
            currSlide:0,
            slides: [],
            _id: ''
        };

        /* In pushSlide and saveChanges, this keyword is used. For binding the this
           to the Component.
        */

        this.pushSlide.bind(this)
        this.saveChanges.bind(this)

        this.escFunction.bind(this)
    }

    escFunction(event){

        if(event.keyCode ===  37) {
          this.previous()
        }
        if(event.keyCode ===  39) {
          this.next()
        }
    }


    getDB(db) {

        /*This function is intended for getting the reference to the drawing board
          object in the DrawingBoardCmp. This function is passed as the prop to the
          DrawingBoardCmp. It is executed in the componentDidMount where
          drawingboard is initialized, which is passed as db. The reference is
          retrieved here and used in this component.
        */

        this.db = db
    }


    componentDidMount() {  
      this.isInteractEnabled=false;
      this.undoArray= [];
      this.curPosition= [];
        /* board:reset and board:stopDrawing are events associated with the drawing
           board. They are triggered whenever the we press the reset button or stop
           the drawing. Whenever these events are triggered, the changed method is
           called. See the definition below.

           Tracker autorun is used because we are retrieving the Requests data
           here.
        */
       document.getElementsByClassName('drawing-board-canvas')[0].style['z-index'] = 2;
       Meteor.subscribe('lessonplans')

        this.db.ev.bind('board:reset', this.changed.bind(this));
        this.db.ev.bind('board:stopDrawing', this.changed.bind(this));

        document.addEventListener("keydown", this.escFunction.bind(this), false);

        this.simTracker = Tracker.autorun(()=>{


            /*The obtained lessonplan is spreaded and set to the state.

              If the lessonplan in brand new, slides[0] will be empty string, we need to
              initialize the first slide before doing any actions. So reset is called.

              If notes are already there, the first slide is set to the drawing board.
            */
           const { _id } = this.props.match.params

           const lessonplan = LessonPlans.findOne(_id)
            if(lessonplan) {
              if (this.undoArray.length == 0 && lessonplan.slides[0].note != ''){
                this.undoArray = lessonplan.slides.map((slide) => {
                  this.curPosition.push(0);
                  return [slide.note];
                });
              }

                this.setState({
                    ...lessonplan
                },() => {
                    if(this.state.slides[0].note === '') {
                        this.db.reset({ webStorage: false, history: true, background: true })
                    }
                    else {
                        this.db.setImg(this.state.slides[this.state.currSlide].note)
                    }
                })
            }
        })
    }

    componentWillUnmount() {
        this.simTracker.stop()
        document.removeEventListener("keydown", this.escFunction, false);
    }

    shouldComponentUpdate(nextState) {

        /*To avoid unnuecessary re-renderings*/

        if(this.state.slides === nextState.slides)
            return false
        else
            return true

        if(this.state.currSlide === this.state.currSlide)
            return false
        else
            return true
    }

    changed() {
        /*
            Whenever board:reset or board:StopDrawing event occurs, this function is called.
            Here we retrieve the current slide no. and note from the states. The notes are
            updated and stored back to the state.
        */
        const {currSlide, slides} = this.state

        const note = this.db.getImg()
        slides[currSlide].note = note

        if(this.undoArray[currSlide]){
          this.undoArray[currSlide].push(note);
          this.curPosition[currSlide]++;
        }
        else{
          this.undoArray.push([note]);
          this.curPosition.push(0);
        }

        this.setState({slides})
    }


    next() {

        /*
            The undo stack is cleared. The current slide no. and slides are retrieved.

            If the current slide is the last slide, we cannot move forward.

            If the current slide is not the last slide, current slide no. is incremented and
            and the notes of that particular slide is set to the board.
        */

        this.db.initHistory()

        let {currSlide, slides} = this.state

        if(currSlide === slides.length-1) {
            return
        }
        else {
            currSlide++
            this.saveChanges(slides, currSlide)
        }
    }

    addNewSlide(e) {

        let {currSlide, slides} = this.state

        this.pushSlide(slides)
            currSlide = slides.length-1
            this.setState({
                currSlide
            },()=>{
                this.db.reset({ webStorage: false, history: true, background: true })
        })
    }

    previous() {

        /*
            If the current slide is not the beggining slide, Undo stack is cleared.
            The current slide no. is decremented and the notes of that particular
            slide is set to the board.
        */

       let {currSlide, slides} = this.state

        if(currSlide!=0) {
            this.db.initHistory()
            currSlide--
            this.saveChanges(slides,currSlide)
        }
    }

    pushSlide(slides) {

        /* To create a new slide, first the structure of slide is defined and
           then pushed to the slides array.
        */

        const newSlide = {
            note: '',
            iframes: []
        }

        slides.push(newSlide)

        this.setState({
            slides
        })
    }

    reset() {

        /* The current slide is made 0 and slides set to empty array.
           The first slide is initialized here. And the old notes are
           cleared.
        */

        this.setState({
            currSlide:0,
            slides:[]
        },()=>{
            const { slides } = this.state
            this.pushSlide(slides)
            this.db.reset({ webStorage: false, history: true, background: true })
        })
        this.db.initHistory()
    }

    save() {

        const {_id, slides} = this.state

        LessonPlans.update(_id, {$set:{slides}},()=>{
            alert('Saved succesfully')
        })
    }

    saveChanges(slides, currSlide) {

        /* This function is used in multiple places to save the changes. Depending upon
           the change made, the changes are saved looking upon arguments given when the
           function was called.
        */

        if(slides == undefined) {
            this.setState({
                currSlide
            },()=>{
                this.db.setImg(this.state.slides[this.state.currSlide].note)
            })
        }
        else if(currSlide == undefined) {
            this.setState({
                slides
            })
        }
        else {
            this.setState({
                slides,
                currSlide
            },()=>{
                this.db.setImg(this.state.slides[this.state.currSlide].note)
            })
        }
    }

    deleteSlide(slides, index) {

        /* This function decides what to do when the X button is pressed in the
           slide element. If there is only one element. it is not deleted,
           it is just reset. Otherwise, the slide is deleted and the current slide
           is set to the preceeding slide.
        */

        if(slides.length!=1) {
            slides.splice(index, 1)
            let { currSlide } = this.state
            this.undoArray.splice(index,1);
            this.curPosition.splice(index,1);
            if(index == 0) {
                currSlide = 0
            }
            if(currSlide == slides.length)
                currSlide = slides.length-1
            this.saveChanges(slides, currSlide)
        }
        else{
          this.undoArray=[], this.curPosition=[];
          this.reset()
        }
    }

    deleteSim(slides, iframeArray, index) {

        /* This function decides what to do when cross button is pressed in the
           simulation. The simulation is deleted from the iframes array of the
           current slide and the changes are saved.
        */
       
        iframeArray.splice(index,1)
        slides[this.state.currSlide].iframes = iframeArray
        this.saveChanges(slides)
    }

    interact(){
      this.isInteractEnabled = !this.isInteractEnabled;
      if(this.isInteractEnabled) {
        document.getElementsByClassName('drawing-board-canvas-wrapper')[0].style['pointer-events'] = 'none'
      }
      else {
        document.getElementsByClassName('drawing-board-canvas-wrapper')[0].style['pointer-events'] = 'unset'
      }
    }

    undo(e){
      this.curPosition[this.state.currSlide]--;
      const slides = this.state.slides;
      slides[this.state.currSlide].note = this.undoArray[this.state.currSlide][this.curPosition[this.state.currSlide]];
      this.db.setImg(this.undoArray[this.state.currSlide][this.curPosition[this.state.currSlide]]);
      this.undoArray[this.state.currSlide].pop()
      this.setState({
        slides
      });
    }


    render() {

        return(
        <div>
            {<DrawingBoardCmp getDB = {this.getDB.bind(this)} ref = 'd'/>}          
            <h1>{this.state.currSlide}</h1>
            <button onClick = {this.addNewSlide.bind(this)}>+</button>
            <List showTitle = {false} {...this.state} delete = {this.deleteSlide.bind(this)} saveChanges= {this.saveChanges.bind(this)}/>                                                           

            <AddSim {...this.state} saveChanges = {this.saveChanges.bind(this)}/>

           
            <button onClick = {this.reset.bind(this)}>Reset</button>  
            <button onClick = {this.save.bind(this)}>Save</button>

            <p>Interact
                <input onChange={this.interact.bind(this)} type = 'checkbox'/>
            </p>

            <Link to = '/lessonplans'><button>Back</button></Link>
             <Link to={{ pathname: `/request/${this.state._id}`}}>
                <button>
                Request new simulations
            </button>
            </Link>

            {(this.curPosition[this.state.currSlide] == 0) ? <button disabled>Undo</button> : <button onClick={this.undo.bind(this)}>Undo</button>}

            {/* {(this.curPosition[this.state.currSlide] == this.undoArray[this.state.currSlide].length-1) ? <button disabled>Redo</button> : <button>Redo</button>} */}

            <SimsList saveChanges = {this.saveChanges.bind(this)} delete = {this.deleteSim.bind(this)} {...this.state}/>
        </div>
        )
    }
}
