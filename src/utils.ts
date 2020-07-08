import {verify} from 'jsonwebtoken';
import {Context} from './context';

export const APP_SECRET='informatube';

interface Token {
  userId: string
}

export function getUserId(context: Context) {
  const Authorization = context.request.get('Authorization');
  if(Authorization) {
    const token = Authorization.replace('Bearer ', '');
    const verifiedToken = verify(token, APP_SECRET) as Token;
    return verifiedToken && verifiedToken.userId
  }
}

const dot = (vec1:number[], vec2:number[]) => {
  let result = 0
  for(let i=0;i<vec1.length;i++) {
    result += vec1[i]*vec2[i];
  }
  return result;
}

const sum = (vec:number[]) => {
  return vec.reduce((a,b) => a+b,0);
}

const sim = (vec1:number[], vec2:number[]) => {
  const cor = dot(vec1, vec2);
  const vec1_abs = Math.sqrt(vec1.reduce((sum,i) => sum+i*i,0));
  const vec2_abs = Math.sqrt(vec2.reduce((sum,i) => sum+i*i,0));
  return cor/(vec1_abs*vec2_abs);
}

const normalizeMatrix = (mat:number[][]) => {
  for(let i=0;i<mat[0].length; i++){
    let mag=0
    for(let j=0;j<mat.length; j++) {
      mag += mat[j][i]*mat[j][i]
    }
    mag = Math.sqrt(mag)
    for(let j=0;j<mat.length; j++) {
      mat[j][i] = mat[j][i] / mag
    }
  }
  return mat;
}

const createSimilarityMatrix = (mat:number[][]) => {
  let sim_mat:number[][] = [];
  mat.forEach((row_i) => {
    let sim_row:number[] = [];
    mat.forEach((row_j) => {
      sim_row.push(sim(row_i,row_j));
    })
    sim_mat.push(sim_row);
  })
  return sim_mat;
}

const transpose = (matrix: number[][]) => {
  return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

const cf = (matrix: number[][]) => {
  const mat = normalizeMatrix(matrix);
  const sim_mat = createSimilarityMatrix(mat);
  const user_mat = transpose(mat);
  let result = [];
  for (let i=0; i<user_mat.length; i++) {
    let user_sim = [];
    for(let j=0; j<sim_mat.length; j++) {
      user_sim.push(dot(user_mat[i],sim_mat[j])/sum(sim_mat[j]))
    }
    result.push(user_sim);
  }
  return result;
}

export const userOrder = (matrix: number[][], user_eval: number[]) => {
  matrix.forEach((row, i) => {
    row.push(user_eval[i])
  })
  const new_matrix = cf(matrix);
  return new_matrix[new_matrix.length-1];
}