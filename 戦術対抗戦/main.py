#import module
import math
import csv
import numpy
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
#end

#import csv file
def road(filename):
  filename += '.csv'
  with open(filename, encoding='utf8', newline='') as f:
      csvreader = csv.reader(f)
      res=[]
      for row in csvreader:
         res.append(row)
      return res          
#end


#road studentdata and process to dictionary
def process_studentdata():
   
  #road studentdata from csv file
  studentdata = road('student')
  #end
  
  
  #process studentdata to dictionary
  student_to_number_dict = dict()
  number_to_student_dict = dict()
  
  for idx in range(1,len(studentdata),1):
     if studentdata[idx][0] != '名前':
        student_to_number_dict[studentdata[idx][0]] = idx
        number_to_student_dict[idx] = studentdata[idx][0]
  
  return [student_to_number_dict,number_to_student_dict]
#end

#road sequencedata and process to rogi_model
def process_sequencedata():
   
  #road sequencedata from csv file
  sequencedata = road('sequence')
  #end   
  
  #declare each sequences
  A1=[]
  A2=[]
  A3=[]
  A4=[]
  S1=[]
  S2=[]
  #end
  
  #ex フィルタ条件,,情報源,日付,名前,勝負,A1,A2,A3,A4,SP,SP,D1,D2,D3,D4,SP,SP,メモ,,,抽出用,ST判定,SP判定,情報源,日付,名前,勝負,A1,A2,A3,A4,SP,SP,D1,D2,D3,D4,SP,SP,メモ
  #put sequencedata into array
  for row in sequencedata[1:]:
     #first attack data
     A1.append(row[6])
     A2.append(row[7])
     A3.append(row[8])
     A4.append(row[9])
     S1.append(row[10])
     S2.append(row[11])
     
     #first defence data
     A1.append(row[12])
     A2.append(row[13])
     A3.append(row[14])
     A4.append(row[15])
     S1.append(row[16])
     S2.append(row[17])
     
     #data deficit
     if row[28]=='':
        continue
     
     #second attack data
     A1.append(row[28])
     A2.append(row[29])
     A3.append(row[30])
     A4.append(row[31])
     S1.append(row[32])
     S2.append(row[33])
     
     #second defence data
     A1.append(row[34])
     A2.append(row[35])
     A3.append(row[36])
     A4.append(row[37])
     S1.append(row[38])
     S2.append(row[39])
   
  return [A1,A2,A3,A4,S1,S2]
#end


#Logistic regression by statsmodels
def Logistic_regression():
   #prepare data
   [student_to_number_dict,number_to_student_dict] = process_studentdata()
   studentsize=len(student_to_number_dict)
   
   [A1,A2,A3,A4,S1,S2] = process_sequencedata()
   sequencesize = len(A1)
   
   
   #explain variation
   xA1=[[0 for j in range(studentsize+1)] for i in range(sequencesize)]
   xS1=[[0 for j in range(studentsize+1)] for i in range(sequencesize)]
   xS2=[[0 for j in range(studentsize+1)] for i in range(sequencesize)]
   
   #purpose variation
   yA2=[[0 for j in range(sequencesize)] for i in range(studentsize+1)]
   yA3=[[0 for j in range(sequencesize)] for i in range(studentsize+1)]
   yA4=[[0 for j in range(sequencesize)] for i in range(studentsize+1)]
   
   #put data into x,y array
   for i in range(0,sequencesize,1):
       xA1[i][student_to_number_dict[A1[i]]]=1
       xS1[i][student_to_number_dict[S1[i]]]=1
       xS2[i][student_to_number_dict[S2[i]]]=1
       
       yA2[student_to_number_dict[A2[i]]][i]=1
       yA3[student_to_number_dict[A3[i]]][i]=1
       yA4[student_to_number_dict[A4[i]]][i]=1
       
   print(xA1[:5])


def main():
   print(235)
   Logistic_regression()



if __name__ == "__main__":
    main()
    