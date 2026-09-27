import java.util.*;
class Main{
    public static void main(String[] args){
        Scanner sc=new Scanner(System.in);
        String s=sc.nextLine();
        int left=0;
        int cnt=0;
        HashMap<Character, Integer> map=new HashMap<>();
        if(s==""){
            System.out.println("String is empty")
        }
        for(int right=0;right<s.length();right++){
            char ch=s.charAt(right);
            map.put(ch, map.getOrDefault(ch,0)+1);
            while(map.get(ch)>1){
                char leftchar=s.charAt(left);
                map.put(leftchar, map.get(leftchar)-1);
                left++;
            }
            cnt=Math.max(cnt, right-left+1);
        }
        System.out.println(cnt);
    }
}