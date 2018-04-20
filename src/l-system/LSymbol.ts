import {vec3, mat4} from 'gl-matrix';
//import Turtle from 'Turtle';
//import Plant from '../geometry/Plant';
import LSystem from 'LSystem';

export class ExpansionRule {
    weight: number;
    symbols: Array<LSymbol>;

    constructor(weight: number, symbols: Array<LSymbol>) {
        this.weight = weight;
        this.symbols = symbols;
    }
}

export class LSymbol {
    stringRepr: string;
    action: (lsys: LSystem) => void;
    expansionRules: Array<ExpansionRule>;
    normalizedWeights: Array<number>;

    constructor(stringRepr: string, action: (lsys: LSystem) => void) {
        this.stringRepr = stringRepr;
        this.action = action;
        this.expansionRules = [];
        this.normalizedWeights = [];
    }

    // rules should be an array of tuples
    // each tuple is of the form (weight, symbol)
    // the higher a given weight, the higher the chance the symbol will be chosen
    setExpansionRules(rules: Array<ExpansionRule>) {
        this.expansionRules = rules.slice(0);
        this.updateWeights();
    }

    updateWeights() {
        this.normalizedWeights = [];
        if (this.expansionRules.length == 0) {
            return;
        }
        if (this.expansionRules.length == 1) {
            this.normalizedWeights[0] = 1.0;
            return;
        }

        let totalSum = 0.0;
        for (let i = 0; i < this.expansionRules.length; i++) {
            totalSum += this.expansionRules[i].weight;
        }
        if (totalSum == 0.0) {
            return;
        }

        let accWeight = 0.0;
        for (let i = 0; i < this.expansionRules.length; i++) {
            accWeight += this.expansionRules[i].weight / totalSum;
            this.normalizedWeights[i] = accWeight;
        }
    }

    canExpand(): boolean {
        return (this.expansionRules.length > 0);
    }

    // p should be in [0, 1]
    expand(p: number): Array<LSymbol> {
        if (this.expansionRules.length == 0) {
            return [this];
        }
        if (this.expansionRules.length == 1) {
            return this.expansionRules[0].symbols;
        }

        let lastIdx = this.expansionRules.length - 1;
        for (let i = 0; i < lastIdx; i++) {
            if (p < this.normalizedWeights[i]) {
                return this.expansionRules[i].symbols;
            }
        }
        return this.expansionRules[lastIdx].symbols;
    }

};

//export default ExpansionRule;
//export default LSymbol;
