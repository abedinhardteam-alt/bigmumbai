import{a4 as g,b as h,l as k,r as B,E as M,A as P,aT as x,_ as C,Q as m,I as o,K as i,R,ad as $,U as t,V as a,ag as y,ah as b}from"./index-BA9qo8Ju.js";const w=g({__name:"index",setup(f,{expose:s}){s();const{t:l}=h(),e=k(),r=B([{title:l("betAmounts"),body:[]},{title:l("rewordPercent"),body:[]}]),d=async()=>{const c=await P(x());c&&c.data.map(p=>(r[0].body.push(p.lotteryAmount+""),r[1].body.push(p.exchange_Rate*1e3*100/1e3+"%"),p))};M(()=>{d()});function _(){e.back()}const n={$t:l,router:e,pointRule:r,getProductRules:d,onClick:_,toBet:()=>{sessionStorage.setItem("clickedGameType","lottery"),e.push({path:"/"})}};return Object.defineProperty(n,"__isScriptSetup",{enumerable:!1,value:!0}),n}}),A={class:"pointMall-rule__container content"},N={class:"pointMall-rule__container-pointRule"},I={class:"pointMall-rule__container-pointRule__title"},S={class:"pointMall-rule__container-pointRule__body"},V={class:"toBet"};function j(f,s,l,e,r,d){const _=m("NavBar"),v=m("van-icon");return o(),i("div",A,[R(_,{title:e.$t("pointsRule"),"left-arrow":"",onClickLeft:e.onClick},null,8,["title"]),$(` <div class="pointMall-rule__container-claimRule">
			<div class="pointMall-rule__container-claimRule__title">1.{{ $t('claimPoints') }}</div>
			<div class="pointMall-rule__container-claimRule__body">
				<div>{{ $t('descRules1') }}</div>
				<div>
					<p>{{ $t('inviteFriends') }}</p>
					<p>{{ $t('earnPoints') }}</p>
				</div>
				<div @click="router.push({ path: '/main/InvitationBonus' })">
					<span> {{ $t('toClaim') }} </span>
					<van-icon name="upgrade" />
				</div>
			</div>
		</div> `),t("div",N,[t("div",I,a(e.$t("bonusPoints")),1),t("div",S,[t("div",null,a(e.$t("descRules2")),1),t("div",null,[(o(!0),i(y,null,b(e.pointRule,(n,c)=>(o(),i("div",{key:c},[t("p",null,a(n.title),1),(o(!0),i(y,null,b(n.body,u=>(o(),i("li",{key:u},a(u),1))),128))]))),128))]),t("div",{onClick:s[0]||(s[0]=n=>e.toBet())},[t("span",V,a(e.$t("goBetting")),1),R(v,{name:"upgrade",color:"#D23838"})])])])])}const E=C(w,[["render",j],["__scopeId","data-v-26d63714"],["__file","/home/jenkins/agent/workspace/AR041-Pages-india-bigmumbai/src/views/activity/PointMall/Rules/index.vue"]]);export{E as default};
