import {Component, EventEmitter, Input, OnInit, Output} from "@angular/core";
import {DisableSection, Field, HandleBitSet} from "../../../../domain/dynamic-form-model";
import {FormArray, FormGroup, FormGroupDirective} from "@angular/forms";
import {FormControlService} from "../../../../services/form-control.service";

@Component({
  selector: 'app-composite-field',
  templateUrl: './composite-field.component.html'
})

export class CompositeFieldComponent implements OnInit {
  @Input() fieldData: Field;
  @Input() vocabularies: Map<string, object[]>;
  @Input() subVocabularies: Map<string, object[]> = null;
  @Input() editMode: any;
  @Input() readonly : boolean = null;
  @Input() position?: number = null;
  @Input() parentForm: FormGroup;

  @Output() hasChanges = new EventEmitter<boolean>();
  @Output() disableChapter = new EventEmitter<DisableSection>();
  @Output() handleBitSets = new EventEmitter<Field>();
  @Output() handleBitSetsOfComposite = new EventEmitter<HandleBitSet>();

  form: FormGroup;
  hideField: boolean = null;

  constructor(private rootFormGroup: FormGroupDirective, private formService: FormControlService) {
  }

  ngOnInit() {
    // console.log(this.fieldData.name);
    if (this.position !== null) {
      // console.log(this.rootFormGroup.control.controls[this.position]);
      // console.log(this.rootFormGroup.control.controls[this.position].get(this.fieldData.name));
      this.form = this.rootFormGroup.control.controls[this.position].get(this.fieldData.name) as FormGroup;
    } else {
      this.form = this.rootFormGroup.control.get(this.fieldData.name) as FormGroup;
      // console.log(this.form);
    }
    // console.log(this.parentForm);
    this.fieldData.form?.dependsOn?.name.split(';').forEach((name) => {
      this.enableDisableField(this.rootFormGroup.form.get(name).value, this.fieldData.form.dependsOn?.value);

      this.rootFormGroup.form.get(name).valueChanges.subscribe(value => {
        this.enableDisableField(value, this.fieldData.form.dependsOn?.value);
      });
    })

    // if(this.fieldData.form.dependsOn) { // specific changes for composite field, maybe revise it
    //   this.enableDisableField(this.rootFormGroup.form.get(this.fieldData.form.dependsOn.name).value, this.fieldData.form.dependsOn?.value);
    //
    //   this.rootFormGroup.form.get(this.fieldData.form.dependsOn.name).valueChanges.subscribe(value => {
    //     this.enableDisableField(value, this.fieldData.form.dependsOn?.value);
    //   });
    // }
  }

  /** Handle Arrays --> **/
  fieldAsFormArray() {
    return this.form as unknown as FormArray;
  }

  oldFieldAsFormArray(field: string) {
    return this.form.get(field) as FormArray;
  }

  remove(i: number) {
    this.fieldAsFormArray().removeAt(i);
  }

  pushComposite(compositeField: Field) {
    this.fieldAsFormArray().push(this.formService.createCompositeField(compositeField));
  }

  movedElement(e, ) {
    let newOrder: number[] = [];
    e.target.childNodes.forEach(child => {
      newOrder.push(child.id);
    });
    // console.log(newOrder);
    for (let i = 0; i < newOrder.length-1; i++) {
      if (newOrder[i] != i) {
        if (newOrder[i] > i+1) {
          this.move(newOrder[i], i);
          break;
        } else if (newOrder[i] < i) {
          this.move(i, newOrder[i]);
          break;
        }
      }
    }
  }

  move(newIndex: number, currentIndex: number) {
    const formArray = this.fieldAsFormArray();

    const currentGroup = formArray.at(currentIndex);
    formArray.removeAt(currentIndex);
    formArray.insert(newIndex, currentGroup)
  }

  /** <-- Handle Arrays **/

  /** check form fields and tabs validity--> **/

  checkFormValidity(name: string, edit: boolean): boolean {
    return (!this.form.get(name).valid && (edit || this.form.get(name).dirty));
  }

  checkFormArrayValidity(name: string, position: number, edit: boolean, groupName?: string): boolean {
    if (groupName) {
      return (!this.oldFieldAsFormArray(name)?.get([position])?.get(groupName).valid
        && (edit || this.oldFieldAsFormArray(name)?.get([position])?.get(groupName).dirty));

    }
    return (!this.oldFieldAsFormArray(name).get([position]).valid
      && (edit || this.oldFieldAsFormArray(name).get([position]).dirty));
  }

  /** <-- check form fields and tabs validity **/

  /** Handle Bitsets--> **/

  updateBitSet(fieldData: Field) {
    this.timeOut(200).then(() => { // Needed for radio buttons strange behaviour
      if (fieldData.form.mandatory) {
        this.handleBitSets.emit(fieldData);
      }
    });
  }

  updateBitSetOfComposite(fieldData: Field, position: number) {
    if (fieldData.form.mandatory) {
      let tmp = new HandleBitSet();
      tmp.field = fieldData;
      tmp.position = position;
      this.handleBitSetsOfComposite.emit(tmp);
    }
  }

  handleCompositeBitsetOfChildren(data: HandleBitSet) {
    this.handleBitSetsOfComposite.emit(data);
  }

  handleBitsetOfChildren(data: Field) {
    this.handleBitSets.emit(data);
  }

  /** other stuff--> **/
  unsavedChangesPrompt() {
    this.hasChanges.emit(true);
  }

  chapterEdit(data: DisableSection) {
    this.disableChapter.emit(data);
  }

  timeOut(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  enableDisableField(value, enableValue?) {

    if (this.fieldData.form?.dependsOn?.name.split(';').length > 1) {

      let flag = false;
      this.fieldData.form?.dependsOn?.name.split(';').forEach((name) => {
        if (this.rootFormGroup.form.get(name).value?.toString() == enableValue)
          flag = true;

      });

      if (flag) {
        this.form.enable();
        this.hideField = false;
        this.fieldData.form.display.visible = true;
      } else {
        this.form.disable();
        this.form.reset();
        this.hideField = true;
        this.fieldData.form.display.visible = false;
      }
      return;
    }

    if (value === 'Applicable') {
      this.form.enable();
      this.hideField = false;
      this.fieldData.form.display.visible = true;
      return
    }
    let values = enableValue.split(';');
    if (values.includes(value?.toString())) {
      this.form.enable();
      this.hideField = false;
      this.fieldData.form.display.visible = true;
    } else {
      this.form.disable();
      this.form.reset();
      this.hideField = true;
      this.fieldData.form.display.visible = false;
      // maybe add this if the remaining empty fields are a problem
      // (this.formControl as unknown as FormArray).clear();

    }
  }
}
