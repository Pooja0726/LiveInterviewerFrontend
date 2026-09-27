import java.util.*;
class Solution{
    public static void main(String[] args){
        Scanner sc=new Scanner(System.in);
        String s=sc.nextLine();
        HashMap<Character, Integer> map=new HashMap<>();
        int left=0;
        int cnt=0;
        for(int right=0;right<s.length();right++){
            char ch=s.charAt(right);
            map.put(ch, map.getOrDefault(ch, 0)+1);
            while(map.get(ch)>1){
                char leftChar=s.charAt(left);
                map.put(leftChar, map.get(leftChar)-1);
                left++;
            }
            cnt=Math.max(cnt, right-left+1);
        }
        System.out.println(cnt);
    }
}