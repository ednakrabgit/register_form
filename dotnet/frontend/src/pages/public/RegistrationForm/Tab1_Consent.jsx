import Button from '../../../components/Button';
import { useRegistration } from '../../../context/RegistrationContext';

export default function Tab1Consent() {
  const { nextStep, formData, updateData } = useRegistration();

  return (
    <div className="animate-[fadeIn_0.5s]">
      <h2 className="text-2xl font-semibold mb-6 text-primary flex items-center gap-3 border-b-2 border-border pb-3">
        <i className="fa-solid fa-file-contract"></i> 1. นโยบายความเป็นส่วนตัว (PDPA)
      </h2>
      
      <div className="mb-6">
        <span className="block mb-2 font-medium text-textMain">คำประกาศความเป็นส่วนตัว (Privacy Notice)</span>
        <div className="bg-white p-5 rounded-lg border border-border text-sm text-textMuted leading-relaxed">
          <p className="font-bold text-black">เรียน ผู้เข้าอบรมทุกท่าน</p>
          <br/>
          <p>ศูนย์ฝึกอบรมและพัฒนานักประกันภัย บมจ.วิริยะประกันภัย ใคร่แจ้งให้ท่านทราบว่าท่านจำเป็นต้องตรวจสอบประวัติการอบรมของท่านผ่านระบบ e-Licensing ของสำนักงาน คปภ. ก่อนดำเนินการในขั้นตอนต่อไป</p>
          <p className="mt-2">การลงทะเบียนเพื่อเข้ารับการอบรมในปี 2569 โดยขอให้กรอกประวัติการอบรมที่ละเอียด ถูกต้อง และข้อมูลอื่น ๆ ซึ่งอาจรวมถึงข้อมูลส่วนบุคคลบางประเภทที่มีความอ่อนไหว (Sensitive Personal Data) อย่างไรก็ตาม ศูนย์ฝึกอบรมฯ ขอให้ท่านมั่นใจว่า ข้อมูลทั้งหมดจะถูกจัดเก็บ ใช้ด้วยความระมัดระวัง และคำนึงถึงความปลอดภัยสูงสุด ภายใต้นโยบายคุ้มครองข้อมูลส่วนบุคคล (PDPA) และจะไม่เปิดเผยต่อบุคคลภายนอกคามนโยบายการกำกับดูแลข้อมูลฯ ของบริษัทฯ</p>
          <br/>
          <p>การลงทะเบียนครั้งนี้ ขอให้ท่านกรอกข้อมูลด้วยความถูกต้อง การให้ข้อมูลที่คลาดเคลื่อนหรือไม่ถูกต้องจะส่งผลให้ระบบของ สำนักงาน คปภ. ปฏิเสธข้อมูลของท่าน และทำให้ท่านเสียประโยชน์</p>
          <br/>
          <p>ท่านที่ดำเนินการตามขั้นตอนที่ครบถ้วนตามที่แจ้งด้านล่าง จะได้รับการจัดสรรที่นั่งสำหรับการอบรมตามวันและเวลา ของการบันทึกในระบบ</p>
          <br/>
          <p className="font-bold text-black">*** ท่านที่ดำเนินการเรียบร้อยภายในเวลาที่กำหนดเท่านั้น จึงจะได้รับการจัดสรรที่นั่งอบรมให้ในปี 2569 ***</p>
          <br/>
          <p>หากท่านมีข้อสงสัยหรือต้องการสอบถามเพิ่มเติม กรุณาติดต่อ ผ่าน Line Official Account : @viriyahiptc หรือ <a href="https://lin.ee/4k6FJ6g" target="_blank" rel="noreferrer" className="text-primary underline">https://lin.ee/4k6FJ6g</a></p>
          <br/>
          <p>ศูนย์ฝึกอบรมฯ ยินดีให้คำแนะนำและอำนวยความสะดวกแก่ท่านในทุกขั้นตอน และขอขอบพระคุณเป็นอย่างสูงในความร่วมมือและความไว้วางใจที่มีต่อ ศูนย์ฝึกอบรมและพัฒนานักประกันภัย บมจ.วิริยะประกันภัย โดยเสมอมา</p>
          <br/>
          <p>ขอแสดงความนับถือ</p>
          <p className="mt-2">ศูนย์ฝึกอบรมและพัฒนานักประกันภัย<br/>บมจ.วิริยะประกันภัย</p>
        </div>
      </div>

      <div className="mb-6">
        <label className="block mb-2 font-medium text-textMain">
          รับทราบ <span className="text-red-500 font-bold">*</span>
        </label>
        <label 
          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
            formData.pdpaConsent 
              ? 'border-primary bg-primary/5 ring-1 ring-primary' 
              : 'border-border bg-white hover:bg-gray-50'
          }`}
        >
          <input 
            type="checkbox" 
            className="w-5 h-5 accent-primary cursor-pointer rounded-full"
            checked={formData.pdpaConsent}
            onChange={(e) => updateData({ pdpaConsent: e.target.checked })}
          />
          <span className="text-textMain">ข้าพเจ้าได้อ่านและรับทราบนโยบายคุ้มครองข้อมูลส่วนบุคคล</span>
        </label>
      </div>

      <div className="flex justify-end mt-10 pt-5 border-t border-border">
        <Button 
          onClick={nextStep} 
          disabled={!formData.pdpaConsent}
          className={!formData.pdpaConsent ? 'opacity-50 cursor-not-allowed' : ''}
        >
          ถัดไป <i className="fas fa-arrow-right ml-2"></i>
        </Button>
      </div>
    </div>
  );
}
